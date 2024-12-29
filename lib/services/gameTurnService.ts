import * as pwdgen from 'generate-password';
import * as zlib from 'zlib';
import { HttpResponseError } from '../../api/framework';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../lib/email/sesProvider';
import { Config } from '../config';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../dynamoose/gameRepository';
import { GAME_TURN_REPOSITORY_SYMBOL, IGameTurnRepository } from '../dynamoose/gameTurnRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../dynamoose/userRepository';
import { inject, provideSingleton } from '../ioc';
import { pydtLogger } from '../logging';
import { Game, GamePlayer, GameTurn, User } from '../models';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../s3Provider';
import { ActorType, SaveHandler } from '../saveHandlers/saveHandler';
import { SaveHandlerFactory } from '../saveHandlers/saveHandlerFactory';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../snsProvider';
import { UserUtil } from '../util/userUtil';
import { GameUtil } from '../util/gameUtil';
import {
  PRIVATE_USER_DATA_REPOSITORY_SYMBOL,
  IPrivateUserDataRepository
} from '../dynamoose/privateUserDataRepository';
import { ISqsProvider, SQS_PROVIDER_SYMBOL } from '../sqsProvider';
import { StatsUtil } from '../util/statsUtil';
import { DISCOURSE_PROVIDER_SYMBOL, IDiscourseProvider } from '../discourseProvider';

export const GAME_TURN_SERVICE_SYMBOL = Symbol('IGameTurnService');

export interface IGameTurnService {
  getAndUpdateSaveFileForGameState(game: Game, users?: User[]): Promise<void>;
  updateSaveFileForGameState(game: Game, users: User[], handler: SaveHandler): Promise<void>;
  loadSaveFile(game: Game): Promise<Buffer>;
  parseSaveFile(buffer: Buffer, game: Game): SaveHandler;
  moveToNextTurn(game: Game, gameTurn: GameTurn, user: User): Promise<void>;
  defeatPlayers(game: Game, users: User[], newDefeatedPlayers: GamePlayer[]): Promise<void>;
  skipTurn(game: Game, turn: GameTurn): Promise<void>;
  storeSave(game: Game, buffer: Buffer): Promise<void>;
}

@provideSingleton(GAME_TURN_SERVICE_SYMBOL)
export class GameTurnService implements IGameTurnService {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider,
    @inject(SQS_PROVIDER_SYMBOL) private sqs: ISqsProvider,
    @inject(DISCOURSE_PROVIDER_SYMBOL) private discourse: IDiscourseProvider
  ) {}

  public async moveToNextTurn(game: Game, gameTurn: GameTurn, user: User) {
    await Promise.all([this.closeGameTurn(game, gameTurn, user), this.createNextGameTurn(game)]);

    await Promise.all([
      this.userRepository.saveVersioned(user),
      this.gameRepository.saveVersioned(game)
    ]);

    await this.sns.turnSubmitted(game, true);

    await this.sqs.queueTurnForGlobalData({
      turn: gameTurn,
      undo: false,
      gameType: game.gameType
    });
  }

  private async closeGameTurn(game: Game, gameTurn: GameTurn, user: User) {
    game.lastTurnEndDate = gameTurn.endDate = new Date();

    StatsUtil.updateTurnStatistics(game, gameTurn, user);

    await this.gameTurnRepository.saveVersioned(gameTurn);
  }

  private async createNextGameTurn(game: Game) {
    const nextTurn: GameTurn = {
      gameId: game.gameId,
      turn: game.gameTurnRangeKey,
      round: game.round,
      playerSteamId: game.currentPlayerSteamId
    };

    try {
      await this.gameTurnRepository.saveVersioned(nextTurn);
    } catch (err) {
      // If error saving, delete the game turn and retry.  This is probably because
      // a previous save failed and the game turn already exists.
      pydtLogger.warn(
        `Error saving game turn, deleting and trying again: ${JSON.stringify(nextTurn)}`,
        err
      );

      await this.gameTurnRepository.delete(nextTurn);
      await this.gameTurnRepository.saveVersioned(nextTurn);
    }
  }

  public async defeatPlayers(game: Game, users: User[], newDefeatedPlayers: GamePlayer[]) {
    const promises = [];
    const puds = await this.pudRepository.getUserDataForGame(game);

    for (const defeatedPlayer of newDefeatedPlayers) {
      const defeatedUser = users.find(user => {
        return user.steamId === defeatedPlayer.steamId;
      });

      UserUtil.removeUserFromGame(defeatedUser, game, true);

      promises.push(this.userRepository.saveVersioned(defeatedUser));

      promises.push(
        this.discourse.postToSmack(
          game.discourseTopicId,
          `${defeatedUser.displayName} was defeated in round ${game.round}!`
        )
      );

      for (const player of game.players) {
        const curPud = puds.find(pud => {
          return pud.steamId === player.steamId;
        });

        if (curPud && curPud.emailAddress) {
          const isDefeatedPlayer = player.steamId === defeatedPlayer.steamId;
          const desc = isDefeatedPlayer ? 'You have' : `${defeatedUser.displayName} has`;

          if (GameUtil.playerIsHuman(player) || isDefeatedPlayer) {
            promises.push(
              this.ses.sendEmail(
                `${desc} been defeated in ${game.displayName}!`,
                'Player Defeated',
                `<b>${desc}</b> been defeated in <b>${game.displayName}</b>!
                <br /><br />Game URL: ${Config.webUrl}/game/${game.gameId}`,
                curPud.emailAddress
              )
            );
          }
        }
      }
    }

    await Promise.all(promises);
  }

  public async getAndUpdateSaveFileForGameState(game: Game, users: User[]) {
    const s3Key = GameUtil.createS3SaveKey(game.gameId, game.gameTurnRangeKey);

    const data = await this.s3.getObject({
      Bucket: Config.resourcePrefix + 'saves',
      Key: s3Key
    });

    if (!data && !data.Body) {
      throw new Error(`File doesn't exist: ${s3Key}`);
    }

    await this.updateSaveFileForGameState(game, users, this.parseSaveFile(data.Body, game));
  }

  public async updateSaveFileForGameState(game, users, handler: SaveHandler, setPlayerType = true) {
    for (let i = 0; i < handler.civData.length; i++) {
      if (game.players[i]) {
        const player = game.players[i];

        if (!GameUtil.playerIsHuman(player)) {
          // Make sure surrendered players are marked as AI
          if (setPlayerType && handler.civData[i].type === ActorType.HUMAN) {
            handler.civData[i].type = ActorType.AI;
          }
        } else {
          if (setPlayerType && handler.civData[i].type === ActorType.AI) {
            handler.civData[i].type = ActorType.HUMAN;
          }

          if (users) {
            const user = users.find(u => {
              return u.steamId === player.steamId;
            });

            // Make sure player names are correct
            if (handler.civData[i].playerName !== user.displayName) {
              handler.civData[i].playerName = user.displayName;
            }
          }

          if (player.steamId === game.currentPlayerSteamId) {
            // Delete any password for the active player
            if (handler.civData[i].password) {
              handler.civData[i].password = null;
            }
          } else {
            // Make sure all other players have a random password
            handler.civData[i].password = pwdgen.generate({});
          }
        }
      }
    }

    handler.cleanupSave(game);

    const uncompressedBody = handler.getData();

    await this.storeSave(game, uncompressedBody);
  }

  public async loadSaveFile(game: Game) {
    const data = await this.s3.getObject({
      Bucket: Config.resourcePrefix + 'saves',
      Key: GameUtil.createS3SaveKey(game.gameId, game.gameTurnRangeKey)
    });

    if (!data || !data.Body) {
      throw new Error("File doesn't exist?");
    }

    let buffer = data.Body;

    // Attempt to gunzip...
    try {
      buffer = zlib.unzipSync(data.Body as Buffer);
    } catch (e) {
      // If unzip fails, assume raw save file was uploaded...
      pydtLogger.info('unzip failed :(', e);
    }

    return buffer;
  }

  public parseSaveFile(buffer: Buffer, game: Game): SaveHandler {
    try {
      return SaveHandlerFactory.getHandler(buffer, game);
    } catch (e) {
      if (e instanceof HttpResponseError) {
        throw e;
      } else {
        pydtLogger.error(`Error parsing file from game ${game.gameId}`, e);

        throw new HttpResponseError(
          400,
          `Could not parse uploaded file!  If you continue to have trouble please post on the PYDT forums.`
        );
      }
    }
  }

  public async skipTurn(game: Game, turn: GameTurn) {
    const data = await this.s3.getObject({
      Bucket: Config.resourcePrefix + 'saves',
      Key: GameUtil.createS3SaveKey(game.gameId, game.gameTurnRangeKey)
    });

    if (!data && !data.Body) {
      throw new Error("File doesn't exist?");
    }

    game.gameTurnRangeKey++;
    turn.skipped = true;

    const users = await this.userRepository.getUsersForGame(game);
    const oldUser = users.find(x => x.steamId === game.currentPlayerSteamId);

    const skippedPlayerIndex = GameUtil.getCurrentPlayerIndex(game);
    const nextPlayerIndex = GameUtil.getNextPlayerIndex(game);

    if (nextPlayerIndex < 0) {
      return;
    }

    if (nextPlayerIndex <= skippedPlayerIndex) {
      game.round++;
    }

    game.currentPlayerSteamId = game.players[nextPlayerIndex].steamId;

    const saveHandler = this.parseSaveFile(data.Body, game);
    let humanCount = 0;

    for (let i = 0; i < game.players.length; i++) {
      if (saveHandler.civData[i].type === ActorType.HUMAN) {
        humanCount++;
      }
    }

    if (humanCount < 3) {
      pydtLogger.warn(`Need at least 3 human players to skip!`);
      return;
    }

    saveHandler.civData[skippedPlayerIndex].type = ActorType.AI;
    saveHandler.setCurrentTurnIndex(nextPlayerIndex);
    this.updateSaveFileForGameState(game, users, saveHandler, false);

    await this.storeSave(game, saveHandler.getData());

    await this.moveToNextTurn(game, turn, oldUser);

    const pud = await this.pudRepository.get(oldUser.steamId);

    if (pud.emailAddress && !oldUser.vacationMode) {
      await this.ses.sendEmail(
        'You have been skipped in ' + game.displayName + '!',
        `You've been skipped!`,
        `The amount of time alloted for you to play your turn has expired.  Try harder next time!`,
        pud.emailAddress
      );
    }
  }

  public async storeSave(game: Game, buffer: Buffer) {
    const key = GameUtil.createS3SaveKey(game.gameId, game.gameTurnRangeKey);

    await Promise.all([
      this.s3.putObject(
        {
          Bucket: Config.resourcePrefix + 'saves',
          Key: key
        },
        buffer
      ),
      this.s3.putObject(
        {
          Bucket: Config.resourcePrefix + 'saves',
          Key: key + '.gz'
        },
        zlib.gzipSync(buffer)
      )
    ]);
  }
}
