import { Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { Config } from '../../../lib/config';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../../lib/s3Provider';
import { GameUtil } from '../../../lib/util/gameUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { StartTurnSubmitResponse } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_StartSubmit)
export class GameController_StartSubmit {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/startSubmit')
  public async startSubmit(
    @Request() request: HttpRequest,
    gameId: string
  ): Promise<StartTurnSubmitResponse> {
    const game = await this.gameRepository.getOrThrow404(gameId);
    if (game.currentPlayerSteamId !== request.user) {
      throw new HttpResponseError(400, "It's not your turn!");
    }

    return {
      putUrl: await this.s3.signedPutUrl(
        {
          Bucket: Config.resourcePrefix + 'saves',
          Key: GameUtil.createS3SaveKey(gameId, game.gameTurnRangeKey + 1)
        },
        'application/octet-stream',
        300
      )
    };
  }
}
