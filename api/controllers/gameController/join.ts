import * as bcrypt from 'bcryptjs';
import { RANDOM_CIV } from 'pydt-shared-models';
import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../../lib/email/sesProvider';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game, GamePlayer } from '../../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../../lib/services/gameTurnService';
import { GameUtil } from '../../../lib/util/gameUtil';
import { UserUtil } from '../../../lib/util/userUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { JoinGameRequestBody } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Join)
export class GameController_Join {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/join')
  public async join(@Request() request: HttpRequest, gameId: string, @Body() body: JoinGameRequestBody): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);
    let targetPlayer: GamePlayer;

    if (game.inProgress) {
      if (!game.allowJoinAfterStart) {
        throw new HttpResponseError(400, 'Game does not allow joining after start!');
      }

      targetPlayer = game.players.find(player => {
        return player.civType === body.playerCiv;
      });

      if (!targetPlayer) {
        throw new HttpResponseError(400, 'Requested civ not found.');
      }

      if (targetPlayer.steamId) {
        throw new HttpResponseError(400, 'Slot already assigned.');
      }
    } else {
      if (game.randomOnly && body.playerCiv !== RANDOM_CIV.leaderKey) {
        throw new HttpResponseError(400, 'You can only join this game as a random civ!');
      }

      if (body.playerCiv !== RANDOM_CIV.leaderKey && game.players.map(x => x.civType).indexOf(body.playerCiv) >= 0) {
        throw new HttpResponseError(400, 'Civ already in Game');
      }
    }

    if (game.players.map(x => x.steamId).indexOf(request.user) >= 0) {
      throw new HttpResponseError(400, 'Player already in Game');
    }

    if (GameUtil.getHumans(game).length >= game.humans) {
      throw new HttpResponseError(400, 'Too many humans already in game.');
    }

    if (game.hashedPassword) {
      if (!(await bcrypt.compare(body.password || '', game.hashedPassword))) {
        throw new HttpResponseError(400, 'Supplied password does not match game password!');
      }
    }

    if (targetPlayer) {
      targetPlayer.steamId = request.user;
    } else {
      game.players.push({
        steamId: request.user,
        civType: body.playerCiv
      });
    }

    const user = await this.userRepository.get(request.user);

    if (!user.emailAddress) {
      throw new HttpResponseError(404, 'You need to set an email address for notifications before joining a game.');
    }

    if (user.banned) {
      throw new HttpResponseError(
        400,
        'You have been banned from the site.  Please get in touch with us to state your case if you want reinstatement.'
      );
    }

    UserUtil.addUserToGame(user, game);

    await Promise.all([this.gameRepository.saveVersioned(game), this.userRepository.saveVersioned(user)]);

    const users = await this.userRepository.getUsersForGame(game);

    const createdByUser = users.find(u => {
      return u.steamId === game.createdBySteamId;
    });

    const promises = [];

    if (createdByUser.emailAddress) {
      promises.push(
        this.ses.sendEmail(
          'A new user has joined your game!',
          'A new user has joined your game!',
          `The user <b>${user.displayName}</b> has joined your game <b>${game.displayName}</b>!  ` +
            `There are now <b>${GameUtil.getHumans(game, true).length} / ${game.humans}</b> ` +
            `human player slots filled in the game.`,
          createdByUser.emailAddress
        )
      );
    }

    if (game.inProgress) {
      promises.push(this.gameTurnService.getAndUpdateSaveFileForGameState(game, users));
    }

    await Promise.all(promises);

    return game;
  }
}
