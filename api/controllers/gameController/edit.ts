import * as bcrypt from 'bcryptjs';
import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { RANDOM_CIV } from '../../../lib/metadata/civGame';
import { Game } from '../../../lib/models';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../../lib/snsProvider';
import { GameUtil } from '../../../lib/util/gameUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { GameRequestBody } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Edit)
export class GameController_Edit {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/edit')
  public async edit(
    @Request() request: HttpRequest,
    gameId: string,
    @Body() body: GameRequestBody
  ): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, `You didn't create this game!`);
    }

    if (!game.inProgress) {
      game.displayName = body.displayName;
      game.randomOnly = body.randomOnly;

      if (game.randomOnly) {
        game.players.forEach(x => (x.civType = RANDOM_CIV.leaderKey));
      }
    }

    if (game.gameTurnRangeKey || 0 <= 1) {
      if (body.slots < game.players.length) {
        throw new HttpResponseError(
          400,
          `You can't change the number of slots to less than the current number of players!`
        );
      }

      game.slots = body.slots;
      game.dlc = body.dlc;
      game.gameSpeed = body.gameSpeed;
      game.mapFile = body.mapFile;
      game.mapSize = body.mapSize;
    }

    if (body.humans < game.players.filter(x => GameUtil.playerIsHuman(x)).length) {
      throw new HttpResponseError(
        400,
        `You can't change the number of humans to less than the current number of humans!`
      );
    }

    game.description = body.description;
    game.humans = body.humans;
    game.allowJoinAfterStart = body.allowJoinAfterStart;
    game.webhookUrl = body.webhookUrl;
    game.turnTimerMinutes = body.turnTimerMinutes;

    if (body.password) {
      if (body.password !== game.hashedPassword) {
        const salt = await bcrypt.genSalt(10);
        game.hashedPassword = await bcrypt.hash(body.password, salt);
      }
    } else {
      game.hashedPassword = null;
    }

    const retVal = await this.gameRepository.saveVersioned(game);
    await this.sns.gameUpdated(game);
    return retVal;
  }
}
