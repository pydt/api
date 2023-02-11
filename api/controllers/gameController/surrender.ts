import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../../lib/dynamoose/gameTurnRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../../lib/email/sesProvider';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game, GameTurn, User } from '../../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../../lib/services/gameTurnService';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../../lib/snsProvider';
import { GameUtil } from '../../../lib/util/gameUtil';
import { UserUtil } from '../../../lib/util/userUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { SurrenderBody } from './_models';
import {
  PRIVATE_USER_DATA_REPOSITORY_SYMBOL,
  IPrivateUserDataRepository
} from '../../../lib/dynamoose/privateUserDataRepository';
import { Config } from '../../../lib/config';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Surrender)
export class GameController_Surrender {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/surrender')
  public async surrender(
    @Request() request: HttpRequest,
    gameId: string,
    @Body() body: SurrenderBody
  ): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);
    let userId = request.user;

    if (body.kickUserId) {
      if (game.createdBySteamId !== request.user) {
        throw new HttpResponseError(400, 'You must be the game creator to kick a user!');
      }

      const kickUser = await this.userRepository.get(body.kickUserId);

      if (!kickUser.banned) {
        const lastTurnTime = (game.lastTurnEndDate || game.updatedAt).getTime();
        const diffTime = new Date().getTime() - lastTurnTime;

        if (diffTime < 1000 * 60 * 60 * 24) {
          throw new HttpResponseError(
            404,
            `You cannot kick a user if they haven't had 24 hours to play their turn.`
          );
        }
      }

      userId = body.kickUserId;
    }

    const player = game.players.find(p => {
      return p.steamId === userId;
    });

    if (!player) {
      throw new HttpResponseError(404, 'Player not in Game.');
    }

    if (player.hasSurrendered) {
      throw new HttpResponseError(404, 'Player has already surrendered!');
    }

    if (game.gameTurnRangeKey <= 1) {
      throw new HttpResponseError(404, `You can't surrender yet!  Create the game!`);
    }

    player.hasSurrendered = true;
    player.surrenderDate = new Date();

    game.completed = GameUtil.calculateIsCompleted(game);

    const user = await this.userRepository.get(userId);

    UserUtil.removeUserFromGame(user, game, true);

    const savePromises: Promise<User | Game | GameTurn | void>[] = [];

    if (game.players.filter(p => GameUtil.playerIsHuman(p)).length) {
      const gameTurn = await this.gameTurnRepository.get({
        gameId: gameId,
        turn: game.gameTurnRangeKey
      });

      if (user.steamId === game.currentPlayerSteamId) {
        // Update the current player if it's the turn of the player who's surrendering
        const curIndex = GameUtil.getCurrentPlayerIndex(game);
        const nextIndex = GameUtil.getNextPlayerIndex(game);

        if (nextIndex >= 0) {
          game.currentPlayerSteamId = gameTurn.playerSteamId = game.players[nextIndex].steamId;

          if (nextIndex <= curIndex) {
            game.round = gameTurn.round++;
          }
        }

        gameTurn.startDate = new Date();
      }

      savePromises.push(
        this.gameTurnService.getAndUpdateSaveFileForGameState(game),
        this.gameTurnRepository.saveVersioned(gameTurn)
      );
    }

    const firstHuman = game.players.find(GameUtil.playerIsHuman);

    if (firstHuman && firstHuman.steamId !== game.createdBySteamId) {
      // If game creator has surrendered, transfer admin to first available player
      game.createdBySteamId = firstHuman.steamId;
    }

    savePromises.push(
      this.userRepository.saveVersioned(user),
      this.gameRepository.saveVersioned(game)
    );

    await Promise.all(savePromises);

    await this.sns.turnSubmitted(game);

    // Send an email to everyone else left in the game....
    const emailPromises = [];
    const puds = await this.pudRepository.getUserDataForGame(game);

    for (const gamePlayer of game.players) {
      const curUserData = puds.find(u => {
        return u.steamId === gamePlayer.steamId;
      });

      if (curUserData && curUserData.emailAddress) {
        let desc = 'surrendered';

        if (body.kickUserId) {
          desc = 'been kicked';
        }

        if (GameUtil.playerIsHuman(gamePlayer)) {
          emailPromises.push(
            this.ses.sendEmail(
              `A player has ${desc} from ${game.displayName}!`,
              `A player has ${desc} from ${game.displayName}!`,
              `<b>${user.displayName}</b> has ${desc} from <b>${game.displayName}</b>. :(
              <br /><br />Game URL: ${Config.webUrl}/game/${game.gameId}`,
              curUserData.emailAddress
            )
          );
        }

        if (gamePlayer.steamId === body.kickUserId) {
          emailPromises.push(
            this.ses.sendEmail(
              `You have been kicked from ${game.displayName}!`,
              `You have been kicked from ${game.displayName}!`,
              `You have been kicked from <b>${game.displayName}</b>. If you feel this was unwarranted, ` +
                `please contact mike@playyourdamnturn.com and we can try to mediate the situation.`,
              curUserData.emailAddress
            )
          );
        }
      }
    }

    await Promise.all(emailPromises);

    return game;
  }
}
