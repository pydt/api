import { Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { v4 as uuid } from 'uuid';
import { DISCOURSE_PROVIDER_SYMBOL, IDiscourseProvider } from '../../../lib/discourseProvider';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { UserUtil } from '../../../lib/util/userUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Clone)
export class GameController_Clone {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(DISCOURSE_PROVIDER_SYMBOL) private discourse: IDiscourseProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/clone')
  public async clone(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, "You don't have permission to clone this game!");
    }

    if (!game.inProgress) {
      throw new HttpResponseError(400, 'Game must be in progress to clone!');
    }

    if (game.gameTurnRangeKey < 15) {
      throw new HttpResponseError(400, 'Cannot clone game until turn 15!');
    }

    // See if this game has been cloned before...
    if (await this.gameRepository.getByClonedFromGameId(game.gameId)) {
      throw new HttpResponseError(400, 'This game has already been cloned!');
    }

    const clone: Game = {
      ...game,
      gameId: uuid(),
      displayName: `[CLONED] ${game.displayName}`,
      clonedFromGameId: game.gameId,
      inProgress: false,
      completed: false,
      round: undefined,
      gameTurnRangeKey: undefined,
      currentPlayerSteamId: game.createdBySteamId,
      lastTurnEndDate: undefined,
      players: game.players
        .filter(x => x.steamId)
        .map(x => ({
          civType: x.civType,
          steamId: x.steamId
        })),
      createdAt: undefined,
      updatedAt: undefined,
      discourseTopicId: undefined,
      latestDiscoursePostNumber: undefined,
      latestDiscoursePostUser: undefined,
      version: undefined
    };

    const topic = await this.discourse.addGameTopic(clone, false);

    if (topic) {
      clone.discourseTopicId = topic.topic_id;
    }

    // add all users to cloned game
    const users = await this.userRepository.getUsersForGame(clone);

    await Promise.all(
      users.map(x => {
        UserUtil.addUserToGame(x, clone);
        return this.userRepository.saveVersioned(x);
      })
    );

    await this.gameRepository.saveVersioned(clone);

    return clone;
  }
}
