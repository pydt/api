import { Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../../lib/dynamoose/gameTurnRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { pydtLogger } from '../../../lib/logging';
import { Game, GameTurn } from '../../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../../lib/services/gameTurnService';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../../lib/snsProvider';
import { GameUtil } from '../../../lib/util/gameUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Revert)
export class GameController_Revert {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/revert')
  public async revert(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (game.currentPlayerSteamId !== request.user && game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, `You can't revert this game!`);
    }

    let turn = game.gameTurnRangeKey;
    let lastTurn: GameTurn;

    do {
      turn--;
      const curGameTurn = await this.gameTurnRepository.get({ gameId: game.gameId, turn: turn });

      const player = game.players.find(p => {
        return p.steamId === curGameTurn.playerSteamId;
      });

      if (player && GameUtil.playerIsHuman(player)) {
        lastTurn = curGameTurn;
      }
    } while (!lastTurn);

    const user = await this.userRepository.get(lastTurn.playerSteamId);
    this.gameTurnService.updateTurnStatistics(game, lastTurn, user, true);

    // Update previous turn data
    delete lastTurn.skipped;
    delete lastTurn.endDate;
    game.lastTurnEndDate = lastTurn.startDate = new Date();

    const promises = [];

    // Delete turns between the old turn and the turn to revert to
    for (let i = lastTurn.turn + 1; i <= game.gameTurnRangeKey; i++) {
      pydtLogger.info(`deleting ${gameId}/${i}`);
      promises.push(this.gameTurnRepository.delete({ gameId: gameId, turn: i }));
    }

    // Update game record
    const curPlayerIndex = GameUtil.getCurrentPlayerIndex(game);
    const prevPlayerIndex = GameUtil.getPreviousPlayerIndex(game);

    if (prevPlayerIndex >= curPlayerIndex) {
      game.round--;
    }

    game.currentPlayerSteamId = game.players[prevPlayerIndex].steamId;
    game.gameTurnRangeKey = lastTurn.turn;

    promises.push(this.gameTurnRepository.saveVersioned(lastTurn));
    promises.push(this.gameRepository.saveVersioned(game));
    promises.push(this.userRepository.saveVersioned(user));
    promises.push(this.gameTurnService.getAndUpdateSaveFileForGameState(game));

    await Promise.all(promises);

    await this.sns.turnSubmitted(game);

    return game;
  }
}
