import { Get, Request, Route, Tags } from 'tsoa';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../../lib/dynamoose/gameTurnRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { GameTurn } from '../../../lib/models';
import { HttpRequest, HttpResponseError } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_GetTurns)
export class GameController_GetTurns {
  constructor(
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository
  ) {}

  @Get('{gameId}/turns/{startTurn}/{endTurn}')
  public async getTurns(
    @Request() request: HttpRequest,
    gameId: string,
    startTurn: number,
    endTurn: number
  ): Promise<GameTurn[]> {
    if (startTurn > endTurn) {
      throw new HttpResponseError(400, 'Start turn less than end turn');
    }

    return this.gameTurnRepository.getTurnsForGame(gameId, startTurn, endTurn);
  }
}
