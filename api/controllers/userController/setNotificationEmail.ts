import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { User } from '../../../lib/models';
import { ErrorResponse, HttpRequest } from '../../framework';
import { SetNotificationEmailBody } from './_models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_SetNotificationEmail)
export class UserController_SetNotificationEmail {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('setNotificationEmail')
  public async setNotificationEmail(@Request() request: HttpRequest, @Body() body: SetNotificationEmailBody): Promise<User> {
    const user = await this.userRepository.get(request.user);
    user.emailAddress = body.emailAddress;
    return this.userRepository.saveVersioned(user);
  }
}
