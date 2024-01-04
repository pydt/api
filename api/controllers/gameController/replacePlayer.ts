import * as bcrypt from 'bcryptjs';
import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game, GamePlayer, GameTurn, User } from '../../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../../lib/services/gameTurnService';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../../lib/snsProvider';
import { UserUtil } from '../../../lib/util/userUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { ReplacePlayerRequestBody, ReplaceRequestedSubstitutionPlayerRequestBody } from './_models';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../../lib/dynamoose/gameTurnRepository';
import { GameUtil } from '../../../lib/util/gameUtil';

@Route('game')
@Tags('game')
@provideSingleton(GameController_ReplacePlayer)
export class GameController_ReplacePlayer {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/replaceRequestedSubstitutionPlayer')
  public async replaceRequestedSubstitutionPlayer(
    @Request() request: HttpRequest,
    gameId: string,
    @Body() body: ReplaceRequestedSubstitutionPlayerRequestBody
  ) {
    return this.coreReplace(gameId, body, async ({ game, oldPlayer }) => {
      if (body.newSteamId !== request.user) {
        throw new HttpResponseError(400, 'You can only ask to put yourself in this game!');
      }

      if (!oldPlayer.substitutionRequested) {
        throw new HttpResponseError(400, `This player hasn't asked to be substituted!`);
      }

      if (game.hashedPassword) {
        if (!(await bcrypt.compare(body.password || '', game.hashedPassword))) {
          throw new HttpResponseError(400, 'Supplied password does not match game password!');
        }
      }
    });
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/replacePlayer')
  public async replacePlayer(
    @Request() request: HttpRequest,
    gameId: string,
    @Body() body: ReplacePlayerRequestBody
  ): Promise<Game> {
    return this.coreReplace(gameId, body, ({ game, newUser }) => {
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

      if (
        request.user !== '76561197973299801' &&
        (!newUser.willSubstituteForGameTypes ||
          newUser.willSubstituteForGameTypes.indexOf(game.gameType) < 0)
      ) {
        throw new HttpResponseError(400, 'User to substitute has not given permission!');
      }
    });
  }

  private async coreReplace(
    gameId: string,
    body: ReplacePlayerRequestBody,
    extraValidations: (state: {
      game: Game;
      newUser: User;
      oldPlayer: GamePlayer;
    }) => Promise<void> | void
  ) {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (!game.inProgress) {
      throw new HttpResponseError(400, 'Game must be in progress to replace!');
    }

    const oldPlayer = game.players.find(x => x.steamId === body.oldSteamId);

    if (!oldPlayer) {
      throw new HttpResponseError(400, 'Old player not found');
    }

    if (oldPlayer.isDead) {
      throw new HttpResponseError(400, `Can't replace dead player :(`);
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

    await extraValidations({ game, newUser, oldPlayer });

    users.push(newUser);

    UserUtil.removeUserFromGame(oldUser, game, true);
    UserUtil.addUserToGame(newUser, game);

    oldPlayer.steamId = body.newSteamId;
    delete oldPlayer.surrenderDate;
    delete oldPlayer.hasSurrendered;

    let turn: GameTurn;

    if (game.currentPlayerSteamId === body.oldSteamId) {
      game.currentPlayerSteamId = body.newSteamId;

      turn = await this.gameTurnRepository.get({ gameId, turn: game.gameTurnRangeKey });

      // Reset turn stats
      turn.startDate = new Date();
      turn.playerSteamId = newUser.steamId;
    }

    GameUtil.possiblyUpdateAdmin(game);

    // Reset substitution requested flag in all flows (just in case an admin is doing this)
    oldPlayer.substitutionRequested = false;

    await Promise.all([
      this.userRepository.saveVersioned(oldUser),
      this.userRepository.saveVersioned(newUser),
      this.gameRepository.saveVersioned(game),
      ...(turn ? [this.gameTurnRepository.saveVersioned(turn)] : [])
    ]);

    await this.gameTurnService.getAndUpdateSaveFileForGameState(game, users);
    await this.sns.turnSubmitted(game);

    return game;
  }
}
