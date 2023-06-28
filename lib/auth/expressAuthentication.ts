import { HttpRequest, HttpResponseError } from '../../api/framework/index';
import { Config } from '../config';
import { pydtLogger } from '../logging';
import { JwtUtil } from './jwtUtil';

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
        const steamId = JwtUtil.parseToken(request.headers['authorization']);
        if (!Config.runningLocal) {
          request.subSegment.addAnnotation('user', steamId);
        }
        return steamId;
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
