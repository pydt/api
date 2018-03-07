import { Game, GameTurn, User, GamePlayer, playerIsHuman } from '../models';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../dynamoose/userRepository';
import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../dynamoose/gameRepository';
import { Config } from '../config';
import { IGameTurnRepository, GAME_TURN_REPOSITORY_SYMBOL } from '../dynamoose/gameTurnRepository';
import { sendEmail } from '../../lib/email/ses';
import { sendSnsMessage } from '../sns';
import { pydtLogger } from '../logging';
import * as _ from 'lodash';
import { inject, provideSingleton } from '../ioc';

export const GAME_TURN_SERVICE_SYMBOL = Symbol('IGameTurnService');

export interface IGameTurnService {
  moveToNextTurn(game: Game, gameTurn: GameTurn, user: User): Promise<void>;
  defeatPlayers(game: Game, users: User[], newDefeatedPlayers: GamePlayer[]): Promise<void>;
}

@provideSingleton(GAME_TURN_SERVICE_SYMBOL)
export class GameTurnService implements IGameTurnService {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository
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

    this.gameTurnRepository.updateTurnStatistics(game, gameTurn, user);

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
}
