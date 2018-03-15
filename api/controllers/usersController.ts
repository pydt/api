import { Route, Get, Response, Request } from 'tsoa';
import { provideSingleton, inject } from '../../lib/ioc';
import { User } from '../../lib/models';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { ErrorResponse, HttpRequest } from '../framework';

@Route('users')
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
