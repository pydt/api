import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { User } from '../../../lib/models';
import { ErrorResponse, HttpRequest } from '../../framework';
import { SetWebhookUrlBody } from './_models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_SetWebhookUrl)
export class UserController_SetWebhookUrl {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('setWebhookUrl')
  public async setWebhookUrl(@Request() request: HttpRequest, @Body() body: SetWebhookUrlBody): Promise<User> {
    const user = await this.userRepository.get(request.user);
    user.webhookUrl = body.webhookUrl;
    return this.userRepository.saveVersioned(user);
  }
}
