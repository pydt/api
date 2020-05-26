import { Get, Request, Route, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { User } from '../../../lib/models';
import { HttpRequest } from '../../framework';

@Route('user')
@Tags('user')
@provideSingleton(UserController_ById)
export class UserController_ById {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  @Get('{steamId}')
  public async byId(@Request() request: HttpRequest, steamId: string): Promise<User> {
    return await this.userRepository.getOrThrow404(steamId);
  }
}
