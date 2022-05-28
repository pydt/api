import { Get, Response, Route, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../lib/ioc';
import { User } from '../../lib/models';
import { ErrorResponse } from '../framework';
import * as moment from 'moment';

@Route('users')
@Tags('user')
@provideSingleton(UsersController)
export class UsersController {
  private cachedUsers?: User[];

  private userCacheDate?: Date;

  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('')
  public async all(): Promise<User[]> {
    if (
      !this.cachedUsers ||
      !this.userCacheDate ||
      moment(this.userCacheDate).isBefore(moment().subtract(5, 'minutes'))
    ) {
      this.cachedUsers = await this.userRepository.usersWithTurnsPlayed();
      this.userCacheDate = new Date();
    }

    return this.cachedUsers;
  }
}
