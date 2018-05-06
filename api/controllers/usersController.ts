import { Get, Request, Response, Route, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../lib/ioc';
import { User } from '../../lib/models';
import { ErrorResponse, HttpRequest } from '../framework';

@Route('users')
@Tags('user')
@provideSingleton(UsersController)
export class UsersController {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {
  }

  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('')
  public all(@Request() request: HttpRequest): Promise<User[]> {
    return this.userRepository.usersWithTurnsPlayed();
  }
}
