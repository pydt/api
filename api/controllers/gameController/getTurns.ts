import { Get, Request, Route, Security, Tags } from 'tsoa';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../../lib/dynamoose/gameTurnRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { HttpRequest, HttpResponseError } from '../../framework';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../../lib/s3Provider';
import { Config } from '../../../lib/config';
import { GameUtil } from '../../../lib/util/gameUtil';
import { GameTurnListItem } from './_models';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';

@Route('game')
@Tags('game')
@provideSingleton(GameController_GetTurns)
export class GameController_GetTurns {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider
  ) {}

  @Get('{gameId}/turns/{startTurn}/{endTurn}')
  @Security('api_key', ['ALLOW_ANONYMOUS'])
  public async getTurns(
    @Request() request: HttpRequest,
    gameId: string,
    startTurn: number,
    endTurn: number
  ): Promise<GameTurnListItem[]> {
    if (startTurn > endTurn) {
      throw new HttpResponseError(400, 'Start turn less than end turn');
    }

    const [game, saves, turns] = await Promise.all([
      this.gameRepository.getOrThrow404(gameId),
      this.s3.listObjects(Config.resourcePrefix + 'saves', `${gameId}/`),
      this.gameTurnRepository.getTurnsForGame(gameId, startTurn, endTurn)
    ]);

    return turns.map(turn => {
      let hasSave = saves.Contents?.some(
        y => y.Key === GameUtil.createS3SaveKey(game.gameId, turn.turn)
      );

      if (!GameUtil.canDownloadTurn(game, turn, request.user)) {
        hasSave = false;
      }

      return {
        ...turn,
        hasSave
      };
    });
  }
}
