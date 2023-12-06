import { Get, Request, Route, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../lib/ioc';
import { User } from '../../lib/models';
import { HttpRequest, HttpResponseError } from '../framework';

@Route('users')
@Tags('user')
@provideSingleton(UsersController)
export class UsersController {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  @Get('{steamIds}')
  public async byIds(@Request() request: HttpRequest, steamIds: string): Promise<User[]> {
    const splitIds = steamIds.split(',');

    if (!steamIds || !splitIds.length) {
      throw new HttpResponseError(400, `steamIds must be provided`);
    }

    if (splitIds.length > 20) {
      throw new HttpResponseError(400, `too many!`);
    }

    return await this.userRepository.batchGet(splitIds);
  }
}
