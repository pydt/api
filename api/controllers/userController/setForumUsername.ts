import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { User } from '../../../lib/models';
import { ErrorResponse, HttpRequest } from '../../framework';
import { SetForumUsernameBody } from './_models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_SetForumUsername)
export class UserController_SetForumUsername {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('setForumUsername')
  public async setForumUsername(
    @Request() request: HttpRequest,
    @Body() body: SetForumUsernameBody
  ): Promise<User> {
    const user = await this.userRepository.get(request.user);
    user.forumUsername = body.forumUsername;
    return this.userRepository.saveVersioned(user);
  }
}
