import { Get, Request, Response, Route, Security, Tags } from 'tsoa';
import { IPrivateUserDataRepository, PRIVATE_USER_DATA_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/privateUserDataRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { ErrorResponse, HttpRequest } from '../../framework';
import { CurrentUserDataWithPud } from './_models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_GetCurrentWithPud)
export class UserController_GetCurrentWithPud {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('getCurrentWithPud')
  public async getCurrentWithPud(@Request() request: HttpRequest): Promise<CurrentUserDataWithPud> {
    return {
      user: await this.userRepository.get(request.user),
      pud: await this.pudRepository.get(request.user)
    };
  }
}
