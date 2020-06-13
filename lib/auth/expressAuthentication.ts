import { HttpRequest, HttpResponseError } from '../../api/framework/index';
import { JwtUtil } from './jwtUtil';
import { pydtLogger } from '../logging';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function expressAuthentication(request: HttpRequest, securityName: string, scopes?: string[]): Promise<string> {
  if (securityName === 'api_key') {
    try {
      if (request.headers && request.headers['authorization']) {
        return JwtUtil.parseToken(request.headers['authorization']);
      }
    } catch (e) {
      pydtLogger.warn('Error parsing JWT token', e);
      throw HttpResponseError.createUnauthorized();
    }

    pydtLogger.info('No Authorization header in request!');
  }

  throw HttpResponseError.createUnauthorized();
}
