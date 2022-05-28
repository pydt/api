import { provideSingleton } from './ioc';
import * as request from 'request';
import * as rp from 'request-promise';

export const HTTP_REQUEST_PROVIDER_SYMBOL = Symbol('IHttpRequestProvider');

export interface IHttpRequestProvider {
  request(
    options:
      | (request.UriOptions & rp.RequestPromiseOptions)
      | (request.UrlOptions & rp.RequestPromiseOptions)
  ): rp.RequestPromise;
}

@provideSingleton(HTTP_REQUEST_PROVIDER_SYMBOL)
export class HttpRequestProvider implements IHttpRequestProvider {
  request(
    options:
      | (request.UriOptions & rp.RequestPromiseOptions)
      | (request.UrlOptions & rp.RequestPromiseOptions)
  ): rp.RequestPromise {
    return rp(options);
  }
}
