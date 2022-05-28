import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import {
  IPrivateUserDataRepository,
  PRIVATE_USER_DATA_REPOSITORY_SYMBOL
} from '../../../lib/dynamoose/privateUserDataRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { PrivateUserData, WebPushSubscription } from '../../../lib/models';
import { ErrorResponse, HttpRequest } from '../../framework';
import { DeleteWebPushBody } from './_models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_RegisterWebPush)
export class UserController_RegisterWebPush {
  constructor(
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('registerWebPush')
  public async registerWebPush(
    @Request() request: HttpRequest,
    @Body() body: WebPushSubscription
  ): Promise<PrivateUserData> {
    const pud = await this.pudRepository.get(request.user);
    pud.webPushSubscriptions = [...(pud.webPushSubscriptions || []), body];

    return this.pudRepository.saveVersioned(pud);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('deleteWebPush')
  public async deleteWebPush(
    @Request() request: HttpRequest,
    @Body() body: DeleteWebPushBody
  ): Promise<PrivateUserData> {
    const pud = await this.pudRepository.get(request.user);

    pud.webPushSubscriptions = pud.webPushSubscriptions.filter(x => x.endpoint !== body.endpoint);

    return this.pudRepository.saveVersioned(pud);
  }
}
