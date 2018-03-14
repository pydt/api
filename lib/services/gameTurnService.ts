import { Game, GameTurn, User, GamePlayer, playerIsHuman } from '../models';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../dynamoose/userRepository';
import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../dynamoose/gameRepository';
import { Config } from '../config';
import { IGameTurnRepository, GAME_TURN_REPOSITORY_SYMBOL } from '../dynamoose/gameTurnRepository';
import { sendEmail } from '../../lib/email/ses';
import { sendSnsMessage } from '../sns';
import { pydtLogger } from '../logging';
import { inject, provideSingleton } from '../ioc';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../s3Provider';
import * as _ from 'lodash';
import * as civ6 from 'civ6-save-parser';
import * as zlib from 'zlib';
import * as pwdgen from 'generate-password';
import { HttpResponseError } from '../../api/framework';

export const GAME_TURN_SERVICE_SYMBOL = Symbol('IGameTurnService');

export interface IGameTurnService {
  createS3SaveKey(gameId: string, turn: number): string;
  getAndUpdateSaveFileForGameState(game: Game, users?: User[]): Promise<any>;
  updateTurnStatistics(game: Game, gameTurn: GameTurn, user: User, undo?: boolean): void;
  updateSaveFileForGameState(game: Game, users?: User[], wrapper?): Promise<any>;
  parseSaveFile(buffer, game: Game);
  moveToNextTurn(game: Game, gameTurn: GameTurn, user: User): Promise<void>;
  defeatPlayers(game: Game, users: User[], newDefeatedPlayers: GamePlayer[]): Promise<void>;
}

@provideSingleton(GAME_TURN_SERVICE_SYMBOL)
export class GameTurnService implements IGameTurnService {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider
  ) {
  }

  public async moveToNextTurn(game: Game, gameTurn: GameTurn, user: User) {
    await Promise.all([
      this.closeGameTurn(game, gameTurn, user),
      this.createNextGameTurn(game)
    ]);

    await Promise.all([
      this.userRepository.saveVersioned(user),
      this.gameRepository.saveVersioned(game)
    ]);

    // Send an sns message that a turn has been completed.
    await sendSnsMessage(Config.resourcePrefix() + 'turn-submitted', 'turn-submitted', game.gameId);
  }

  private async closeGameTurn(game: Game, gameTurn: GameTurn, user: User) {
    gameTurn.endDate = new Date();

    this.updateTurnStatistics(game, gameTurn, user);

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
      pydtLogger.warn(`Error saving game turn, deleting and trying again: ${JSON.stringify(nextTurn)}`, err);

      await this.gameTurnRepository.delete(nextTurn);
      await this.gameTurnRepository.saveVersioned(nextTurn);
    }
  }

  public async defeatPlayers(game: Game, users: User[], newDefeatedPlayers: GamePlayer[]) {
    const promises = [];

    for (const defeatedPlayer of newDefeatedPlayers) {
      const defeatedUser = _.find(users, user => {
        return user.steamId === defeatedPlayer.steamId;
      });

      _.pull(defeatedUser.activeGameIds, game.gameId);

      defeatedUser.inactiveGameIds = defeatedUser.inactiveGameIds || [];
      defeatedUser.inactiveGameIds.push(game.gameId);

      promises.push(this.userRepository.saveVersioned(defeatedUser));

      for (const player of game.players) {
        const curUser = _.find(users, user => {
          return user.steamId === player.steamId;
        });

        if (curUser && curUser.emailAddress) {
          let desc = defeatedUser.displayName + ' has';

          if (player === defeatedPlayer) {
            desc = 'You have';
          }

          if (playerIsHuman(player) || player === defeatedPlayer) {
            promises.push(sendEmail(
              `${desc} been defeated in ${game.displayName}!`,
              'Player Defeated',
              `<b>${desc}</b> been defeated in <b>${game.displayName}</b>!`,
              curUser.emailAddress
            ));
          }
        }
      }
    }

    await Promise.all(promises);
  }

  public async getAndUpdateSaveFileForGameState(game: Game, users: User[]) {
    const s3Key = this.createS3SaveKey(game.gameId, game.gameTurnRangeKey);

    const data = await this.s3.getObject({
      Bucket: Config.resourcePrefix() + 'saves',
      Key: s3Key
    });

    if (!data && !data.Body) {
      throw new Error(`File doesn't exist: ${s3Key}`);
    }

    return this.updateSaveFileForGameState(game, users, this.parseSaveFile(data.Body, game));
  }

  public createS3SaveKey(gameId: string, turn: number) {
    return gameId + '/' + ('000000' + turn).slice(-6) + '.CivXSave';
  }

  public updateTurnStatistics(game: Game, gameTurn: GameTurn, user: User, undo?: boolean) {
    const undoInc = undo ? -1 : 1;

    if (gameTurn.endDate) {
      const player = _.find(game.players, p => {
        return p.steamId === user.steamId;
      });

      if (gameTurn.skipped) {
        player.turnsSkipped = (player.turnsSkipped || 0) + 1 * undoInc;
        user.turnsSkipped = (user.turnsSkipped || 0) + 1 * undoInc;
      } else {
        player.turnsPlayed = (player.turnsPlayed || 0) + 1 * undoInc;
        user.turnsPlayed = (user.turnsPlayed || 0) + 1 * undoInc;
      }

      const timeTaken = gameTurn.endDate.getTime() - gameTurn.startDate.getTime();
      player.timeTaken = (player.timeTaken || 0) + timeTaken * undoInc;
      user.timeTaken = (user.timeTaken || 0) + timeTaken * undoInc;

      if (timeTaken < 1000 * 60 * 60) {
        user.fastTurns = (user.fastTurns || 0) + 1 * undoInc;
        player.fastTurns = (player.fastTurns || 0) + 1 * undoInc;
      }

      if (timeTaken > 1000 * 60 * 60 * 6) {
        user.slowTurns = (user.slowTurns || 0) + 1 * undoInc;
        player.slowTurns = (player.slowTurns || 0) + 1 * undoInc;
      }
    }
  }

  public updateSaveFileForGameState(game, users, wrapper) {
    const parsed = wrapper.parsed;

    for (let i = parsed.CIVS.length - 1; i >= 0; i--) {
      const parsedCiv = parsed.CIVS[i];

      if (game.players[i]) {
        const player = game.players[i];

        if (!playerIsHuman(player)) {
          // Make sure surrendered players are marked as AI
          if (parsedCiv.ACTOR_AI_HUMAN.data === 3) {
            civ6.modifyChunk(wrapper.chunks, parsedCiv.ACTOR_AI_HUMAN, 1);
          }
        } else {
          let slotHeaderVal = parsedCiv.SLOT_HEADER.data;

          if (parsedCiv.ACTOR_AI_HUMAN.data === 1) {
            civ6.modifyChunk(wrapper.chunks, parsedCiv.ACTOR_AI_HUMAN, 3);
          }

          if (users) {
            const user = _.find(users, u => {
              return u.steamId === player.steamId;
            });

            // Make sure player names are correct
            if (parsedCiv.PLAYER_NAME) {
              if (parsedCiv.PLAYER_NAME.data !== user.displayName) {
                civ6.modifyChunk(wrapper.chunks, parsedCiv.PLAYER_NAME, user.displayName);
              }
            } else {
              civ6.addChunk(
                wrapper.chunks,
                parsedCiv.LEADER_NAME,
                civ6.MARKERS.ACTOR_DATA.PLAYER_NAME,
                civ6.DATA_TYPES.STRING,
                user.displayName
              );

              slotHeaderVal++;
            }
          }

          if (player.steamId === game.currentPlayerSteamId) {
            // Delete any password for the active player
            if (parsedCiv.PLAYER_PASSWORD) {
              civ6.deleteChunk(wrapper.chunks, parsedCiv.PLAYER_PASSWORD);
              slotHeaderVal--;
            }
          } else {
            // Make sure all other players have a random password
            if (!parsedCiv.PLAYER_PASSWORD) {
              civ6.addChunk(
                wrapper.chunks,
                parsedCiv.LEADER_NAME,
                civ6.MARKERS.ACTOR_DATA.PLAYER_PASSWORD,
                civ6.DATA_TYPES.STRING,
                pwdgen.generate({})
              );

              slotHeaderVal++;
            } else {
              civ6.modifyChunk(wrapper.chunks, parsedCiv.PLAYER_PASSWORD, pwdgen.generate({}));
            }
          }

          civ6.modifyChunk(wrapper.chunks, parsedCiv.SLOT_HEADER, slotHeaderVal);
        }
      }
    }

    const saveKey = this.createS3SaveKey(game.gameId, game.gameTurnRangeKey);
    const uncompressedBody = Buffer.concat(wrapper.chunks);

    return Promise.all([
      this.s3.putObject({
        Bucket: Config.resourcePrefix() + 'saves',
        Key: saveKey
      }, uncompressedBody),
      this.s3.putObject({
        Bucket: Config.resourcePrefix() + 'saves',
        Key: saveKey + '.gz'
      }, zlib.gzipSync(uncompressedBody))
    ]);
  }

  public parseSaveFile(buffer, game: Game) {
    try {
      return civ6.parse(buffer);
    } catch (e) {
      // TODO: Should probably be a non-HTTP specific error type
      throw new HttpResponseError(400, `Could not parse uploaded file!  If you continue to have trouble please post on the PYDT forums.`);
    }
  }
}
