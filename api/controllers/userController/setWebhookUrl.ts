import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { IPrivateUserDataRepository, PRIVATE_USER_DATA_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/privateUserDataRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { PrivateUserData } from '../../../lib/models';
import { ErrorResponse, HttpRequest } from '../../framework';
import { SetWebhookUrlBody } from './_models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_SetWebhookUrl)
export class UserController_SetWebhookUrl {
  constructor(@inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('setWebhookUrl')
  public async setWebhookUrl(@Request() request: HttpRequest, @Body() body: SetWebhookUrlBody): Promise<PrivateUserData> {
    const pud = await this.pudRepository.get(request.user);
    pud.webhookUrl = body.webhookUrl;
    return this.pudRepository.saveVersioned(pud);
  }
}
