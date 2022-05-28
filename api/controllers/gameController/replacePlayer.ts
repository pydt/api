import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../../lib/services/gameTurnService';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../../lib/snsProvider';
import { UserUtil } from '../../../lib/util/userUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { ReplacePlayerRequestBody } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_ReplacePlayer)
export class GameController_ReplacePlayer {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/replacePlayer')
  public async replacePlayer(
    @Request() request: HttpRequest,
    gameId: string,
    @Body() body: ReplacePlayerRequestBody
  ): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (!game.inProgress) {
      throw new HttpResponseError(400, 'Game must be in progress to replace!');
    }

    if (
      request.user !== '76561197973299801' &&
      game.createdBySteamId !== request.user &&
      body.oldSteamId !== request.user
    ) {
      throw new HttpResponseError(
        400,
        "You don't have permission to replace a player in this game!"
      );
    }

    const oldPlayer = game.players.find(x => x.steamId === body.oldSteamId);

    if (!oldPlayer) {
      throw new HttpResponseError(400, 'Old player not found');
    }

    if (game.players.find(x => x.steamId === body.newSteamId)) {
      throw new HttpResponseError(400, 'New player is already in this game!?!');
    }

    const users = await this.userRepository.getUsersForGame(game);
    const oldUser = users.find(x => x.steamId === body.oldSteamId);

    if (!oldUser) {
      throw new HttpResponseError(400, 'Old user not found!');
    }

    const newUser = await this.userRepository.get(body.newSteamId);

    if (!newUser) {
      throw new HttpResponseError(400, 'New user not found!');
    }

    if (
      request.user !== '76561197973299801' &&
      (!newUser.willSubstituteForGameTypes ||
        newUser.willSubstituteForGameTypes.indexOf(game.gameType) < 0)
    ) {
      throw new HttpResponseError(400, 'User to substitute has not given permission!');
    }

    users.push(newUser);

    UserUtil.removeUserFromGame(oldUser, game, true);
    UserUtil.addUserToGame(newUser, game);

    oldPlayer.steamId = body.newSteamId;

    if (game.currentPlayerSteamId === body.oldSteamId) {
      game.currentPlayerSteamId = body.newSteamId;
    }

    await Promise.all([
      this.userRepository.saveVersioned(oldUser),
      this.userRepository.saveVersioned(newUser),
      this.gameRepository.saveVersioned(game)
    ]);

    await this.gameTurnService.getAndUpdateSaveFileForGameState(game, users);
    await this.sns.turnSubmitted(game);

    return game;
  }
}
