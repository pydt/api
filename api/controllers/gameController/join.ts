import * as bcrypt from 'bcryptjs';
import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import {
  IPrivateUserDataRepository,
  PRIVATE_USER_DATA_REPOSITORY_SYMBOL
} from '../../../lib/dynamoose/privateUserDataRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../../lib/email/sesProvider';
import { inject, provideSingleton } from '../../../lib/ioc';
import { RANDOM_CIV } from '../../../lib/metadata/civGame';
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
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/join')
  public async join(
    @Request() request: HttpRequest,
    gameId: string,
    @Body() body: JoinGameRequestBody
  ): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);
    let targetPlayer: GamePlayer;

    if (game.inProgress) {
      if (!game.allowJoinAfterStart) {
        throw new HttpResponseError(400, 'Game does not allow joining after start!');
      }

      targetPlayer = game.players.find(player => {
        return (
          player.civType === body.playerCiv &&
          !player.isDead &&
          (!player.steamId || player.hasSurrendered)
        );
      });

      if (!targetPlayer) {
        throw new HttpResponseError(400, 'Requested civ not found.');
      }
    } else {
      if (game.randomOnly === 'FORCE_RANDOM' && body.playerCiv !== RANDOM_CIV.leaderKey) {
        throw new HttpResponseError(400, 'You can only join this game as a random civ!');
      }

      if (game.randomOnly === 'FORCE_LEADER' && body.playerCiv === RANDOM_CIV.leaderKey) {
        throw new HttpResponseError(400, 'You can only join this game as a non-random leader!');
      }

      if (
        !game.allowDuplicateLeaders &&
        body.playerCiv !== RANDOM_CIV.leaderKey &&
        game.players.map(x => x.civType).indexOf(body.playerCiv) >= 0
      ) {
        throw new HttpResponseError(400, 'Civ already in Game');
      }
    }

    const curPlayer = game.players.find(x => x.steamId === request.user);

    if (curPlayer) {
      if (curPlayer.isDead) {
        delete curPlayer.steamId;
      } else {
        throw new HttpResponseError(400, 'Player already in Game');
      }
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
      targetPlayer.substitutionRequested = false;
      delete targetPlayer.hasSurrendered;
      delete targetPlayer.surrenderDate;
    } else {
      game.players.push({
        steamId: request.user,
        civType: body.playerCiv
      });
    }

    const users = await this.userRepository.getUsersForGame(game);
    const user = users.find(x => x.steamId === request.user);
    const puds = await this.pudRepository.getUserDataForGame(game);
    const pud = puds.find(x => x.steamId === request.user);

    if (!pud.emailAddress) {
      throw new HttpResponseError(
        404,
        'You need to set an email address for notifications before joining a game.'
      );
    }

    if (user.banned) {
      throw new HttpResponseError(
        400,
        'You have been banned from the site.  Please get in touch with us to state your case if you want reinstatement.'
      );
    }

    UserUtil.addUserToGame(user, game);

    await Promise.all([
      this.gameRepository.saveVersioned(game),
      this.userRepository.saveVersioned(user)
    ]);

    const createdByUserData = puds.find(u => {
      return u.steamId === game.createdBySteamId;
    });

    const promises = [];

    if (createdByUserData.emailAddress) {
      promises.push(
        this.ses.sendEmail(
          'A new user has joined your game!',
          'A new user has joined your game!',
          `The user <b>${user.displayName}</b> has joined your game <b>${game.displayName}</b>!  ` +
            `There are now <b>${GameUtil.getHumans(game, true).length} / ${game.humans}</b> ` +
            `human player slots filled in the game.`,
          createdByUserData.emailAddress
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
