import * as bcrypt from 'bcryptjs';
import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { v4 as uuid } from 'uuid';
import { DISCOURSE_PROVIDER_SYMBOL, IDiscourseProvider } from '../../../lib/discourseProvider';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import {
  IPrivateUserDataRepository,
  PRIVATE_USER_DATA_REPOSITORY_SYMBOL
} from '../../../lib/dynamoose/privateUserDataRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { RANDOM_CIV } from '../../../lib/metadata/civGame';
import { Game } from '../../../lib/models';
import { UserUtil } from '../../../lib/util/userUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { CreateGameRequestBody } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Create)
export class GameController_Create {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(DISCOURSE_PROVIDER_SYMBOL) private discourse: IDiscourseProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('create')
  public async create(
    @Request() request: HttpRequest,
    @Body() body: CreateGameRequestBody
  ): Promise<Game> {
    const user = await this.userRepository.get(request.user);
    const pud = await this.pudRepository.get(request.user);

    if (!pud.emailAddress) {
      throw new HttpResponseError(
        400,
        'You need to set a notification email address before you can create a game.'
      );
    }

    if (user.banned) {
      throw new HttpResponseError(
        400,
        'You have been banned from the site.  Please get in touch with us to state your case if you want reinstatement.'
      );
    }

    const games = await this.gameRepository.getGamesForUser(user);
    const userFormingGames = games.filter(game => {
      return (
        game.gameType === body.gameType &&
        game.createdBySteamId === request.user &&
        !game.inProgress
      );
    });

    const MAX_OPEN_GAMES = 10;
    let openGameLimit = Math.floor(Math.max(user.turnsPlayed || 0, 500) / 500);

    if (user.canCreateMultipleGames || openGameLimit > MAX_OPEN_GAMES) {
      openGameLimit = MAX_OPEN_GAMES;
    }

    if (userFormingGames.length >= openGameLimit) {
      throw new HttpResponseError(
        400,
        `You cannot create a new game at the moment because you already have ${openGameLimit} game${
          openGameLimit > 1 ? 's' : ''
        } that ha${openGameLimit > 1 ? 's' : 'v'}en't been started yet!`
      );
    }

    if (body.randomOnly === 'FORCE_RANDOM' && body.player1Civ !== RANDOM_CIV.leaderKey) {
      throw new HttpResponseError(400, 'Hey, you made the rules, random civs only!');
    }

    if (body.randomOnly === 'FORCE_LEADER' && body.player1Civ === RANDOM_CIV.leaderKey) {
      throw new HttpResponseError(400, 'Hey, you made the rules, you must choose a leader!');
    }

    const newGame: Game = {
      gameId: uuid(),
      completed: false,
      inProgress: false,
      createdBySteamId: user.steamId,
      currentPlayerSteamId: user.steamId,
      dlc: body.dlc,
      players: [
        {
          steamId: user.steamId,
          civType: body.player1Civ
        }
      ],
      displayName: body.displayName,
      description: body.description,
      webhookUrl: body.webhookUrl,
      slots: body.slots,
      humans: body.humans,
      gameType: body.gameType,
      gameSpeed: body.gameSpeed,
      mapFile: body.mapFile,
      mapSize: body.mapSize,
      randomOnly: body.randomOnly,
      allowDuplicateLeaders: body.allowDuplicateLeaders,
      allowJoinAfterStart: body.allowJoinAfterStart,
      turnTimerMinutes: body.turnTimerMinutes,
      turnTimerVacationHandling: body.turnTimerVacationHandling
    };

    const firstTimeHosting =
      games.every(x => x.createdBySteamId !== user.steamId) &&
      (await this.gameRepository.getCompletedGamesForUser(user)).every(
        x => x.createdBySteamId !== user.steamId
      );

    const topic = await this.discourse.addGameTopic(newGame, firstTimeHosting);

    if (topic) {
      newGame.discourseTopicId = topic.topic_id;
    }

    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      newGame.hashedPassword = await bcrypt.hash(body.password, salt);
    } else {
      body.password = '';
    }

    UserUtil.addUserToGame(user, newGame);

    await this.userRepository.saveVersioned(user);

    // Save game after user, if user is trying to create games in quick succession one user save should fail
    await this.gameRepository.saveVersioned(newGame);

    return newGame;
  }
}
