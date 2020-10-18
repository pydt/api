import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { IPrivateUserDataRepository, PRIVATE_USER_DATA_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/privateUserDataRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { PrivateUserData } from '../../../lib/models';
import { ErrorResponse, HttpRequest } from '../../framework';
import { SetNotificationEmailBody } from './_models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_SetNotificationEmail)
export class UserController_SetNotificationEmail {
  constructor(@inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('setNotificationEmail')
  public async setNotificationEmail(@Request() request: HttpRequest, @Body() body: SetNotificationEmailBody): Promise<PrivateUserData> {
    const pud = await this.pudRepository.get(request.user);
    pud.emailAddress = body.emailAddress;
    pud.newTurnEmails = body.newTurnEmails;
    return this.pudRepository.saveVersioned(pud);
  }
}
