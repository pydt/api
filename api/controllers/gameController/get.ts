import { Get, Request, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { HttpRequest } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Get)
export class GameController_Get {
  constructor(@inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository) {}

  // Anyone can view a game, but if the caller is logged in we need to know who they are so the
  // game's admin gets the admin-only fields back (see GameUtil.sanitizeForViewer).
  @Security('api_key', ['ALLOW_ANONYMOUS'])
  @Get('{gameId}')
  public get(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    return this.gameRepository.getOrThrow404(gameId);
  }
}
