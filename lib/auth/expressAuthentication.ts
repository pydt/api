import { HttpRequest, HttpResponseError } from '../../api/framework/index';
import { Config } from '../config';
import { PrivateUserDataRepository } from '../dynamoose/privateUserDataRepository';
import { iocContainer } from '../ioc';
import { pydtLogger } from '../logging';
import { JwtData, JwtUtil } from './jwtUtil';

export async function validateNonce(data: JwtData) {
  const pudRepo = iocContainer.resolve(PrivateUserDataRepository);
  const pud = await pudRepo.get(data.steamId);

  if ((pud.tokenNonce || -1) !== (data.nonce || -1)) {
    pydtLogger.warn(`Nonce mismatch: ${pud.tokenNonce} vs ${data.nonce}`);
    throw HttpResponseError.createUnauthorized();
  }
}

export async function expressAuthentication(
  request: HttpRequest,
  securityName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scopes?: string[]
): Promise<string> {
  const allowAnonymous = scopes?.includes('ALLOW_ANONYMOUS');

  if (securityName === 'api_key') {
    try {
      if (request.headers && request.headers['authorization']) {
        const data = JwtUtil.parseToken(request.headers['authorization']);

        await validateNonce(data);

        if (!Config.runningLocal) {
          request.subSegment.addAnnotation('user', data.steamId);
        }
        return data.steamId;
      }
    } catch (e) {
      pydtLogger.warn('Error parsing JWT token', e);
      throw HttpResponseError.createUnauthorized();
    }

    if (!allowAnonymous) {
      pydtLogger.info('No Authorization header in request!');
    }
  }

  if (!allowAnonymous) {
    throw HttpResponseError.createUnauthorized();
  }
}
