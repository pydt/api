import { Get, Query, Request, Route, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { User } from '../../../lib/models';
import { HttpRequest } from '../../framework';

@Route('user')
@Tags('user')
@provideSingleton(UserController_GetSubstituteUsers)
export class UserController_GetSubstituteUsers {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  @Get('getSubstituteUsers')
  public async getSubstituteUsers(
    @Request() request: HttpRequest,
    @Query('gameType') gameType
  ): Promise<User[]> {
    const subUsers = await this.userRepository.substituteUsers();
    return subUsers.filter(x => x.willSubstituteForGameTypes.indexOf(gameType) >= 0);
  }
}
