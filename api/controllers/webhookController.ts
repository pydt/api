import * as crypto from 'crypto';
import { Body, Post, Request, Route, Tags } from 'tsoa';

import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../lib/ioc';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../lib/snsProvider';
import { HttpRequest } from '../framework';

@Route('webhook')
@Tags('webhook')
@provideSingleton(WebhookController)
export class WebhookController {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {
  }

  @Post('newDiscordPost')
  public async newDiscordPost(@Request() request: HttpRequest, @Body() body: NewDiscordPostBody): Promise<void> {
    const headerSignature: string = request.headers['x-discourse-event-signature'];

    if (headerSignature.indexOf('sha256=') !== 0) {
      throw new Error('Signature not found or not sha256: ' + headerSignature);
    }

    const computedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(request.rawBody).digest('hex');

    if (headerSignature.replace('sha256=', '') !== computedSignature) {
      throw new Error(`Header signature ${headerSignature} does not match computed ${computedSignature}!`);
    }

    const game = await this.gameRepository.getByDiscourseTopicId(body.post.topic_id);

    if (game) {
      game.latestDiscoursePostNumber = body.post.post_number;
      game.latestDiscoursePostUser = body.post.display_username;
      await this.gameRepository.saveVersioned(game);
      await this.sns.gameUpdated(game);
    }
  }
}

export interface NewDiscordPostBody {
  post: {
    id: number;
    post_number: number;
    topic_id: number;
    display_username: string;
  };
}
