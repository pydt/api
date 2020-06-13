import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { User } from '../../../lib/models';
import { ErrorResponse, HttpRequest } from '../../framework';
import { SetSubstitutionPrefsBody } from './_models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_SetSubstitutionPrefs)
export class UserController_SetSubstitutionPrefs {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('setSubstitutionPrefs')
  public async setSubstitutionPrefs(@Request() request: HttpRequest, @Body() body: SetSubstitutionPrefsBody): Promise<User> {
    const user = await this.userRepository.get(request.user);

    if (user.turnsPlayed < 500) {
      throw new Error('Must have played 500 turns to substitute!');
    }

    user.willSubstituteForGameTypes = body.willSubstituteForGameTypes;
    return this.userRepository.saveVersioned(user);
  }
}
