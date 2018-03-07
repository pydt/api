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
  public async all(@Request() request: HttpRequest): Promise<User[]> {
    const result: User[] = [];
    let lastKey;

    do {
      let scan = this.userRepository.scan().where('turnsPlayed').gt(0);

      if (lastKey) {
        scan = scan.startAt(lastKey);
      }

      const users: User[] = await scan.exec();

      for (const user of users) {
        delete user.emailAddress; // make sure email address isn't returned!
        result.push(user);
      }

      lastKey = (users as any).lastKey;
    } while (lastKey);

    return result;
  }
}
