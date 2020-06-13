import { Get, Request, Route, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { HttpRequest } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Get)
export class GameController_Get {
  constructor(@inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository) {}

  @Get('{gameId}')
  public get(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    return this.gameRepository.getOrThrow404(gameId);
  }
}
