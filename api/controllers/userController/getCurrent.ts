import { Get, Request, Response, Route, Security, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { User } from '../../../lib/models';
import { ErrorResponse, HttpRequest } from '../../framework';

@Route('user')
@Tags('user')
@provideSingleton(UserController_GetCurrent)
export class UserController_GetCurrent {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('getCurrent')
  public getCurrent(@Request() request: HttpRequest): Promise<User> {
    return this.userRepository.get(request.user);
  }
}
