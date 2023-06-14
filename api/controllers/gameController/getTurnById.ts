// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Why is this flagging Query?
import { Get, Request, Response, Route, Security, Tags } from 'tsoa';
import { Config } from '../../../lib/config';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../../lib/s3Provider';
import { GameUtil } from '../../../lib/util/gameUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { GameTurnResponse } from './_models';
import { PYDT_METADATA } from '../../../lib/metadata/metadata';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../../lib/dynamoose/gameTurnRepository';

@Route('game')
@Tags('game')
@provideSingleton(GameController_GetTurnById)
export class GameController_GetTurnById {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('{gameId}/turn/{turn}')
  public async getTurnById(
    @Request() request: HttpRequest,
    gameId: string,
    turn: number
  ): Promise<GameTurnResponse> {
    const game = await this.gameRepository.getOrThrow404(gameId);
    const gameTurn = await this.gameTurnRepository.getOrThrow404({ gameId, turn });

    if (!game.finalized && gameTurn.playerSteamId !== request.user) {
      throw new HttpResponseError(400, `You can't download this damn turn.`);
    }

    const file = GameUtil.createS3SaveKey(gameId, turn);

    const fileParams = {
      Bucket: Config.resourcePrefix + 'saves',
      Key: file
    };

    const civGame = PYDT_METADATA.civGames.find(x => x.id === game.gameType);

    return {
      downloadUrl: await this.s3.signedGetUrl(
        fileParams,
        `${gameId}_${turn}.${civGame.saveExtension}`,
        60
      )
    };
  }
}
