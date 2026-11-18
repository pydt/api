import { provideSingleton } from './ioc';
import { tracedFetch } from './xray';

export const HTTP_REQUEST_PROVIDER_SYMBOL = Symbol('IHttpRequestProvider');

export interface IHttpRequestProvider {
  fetch<T>(url: string, options: RequestInit, noResponse?: boolean): Promise<T>;
}

@provideSingleton(HTTP_REQUEST_PROVIDER_SYMBOL)
export class HttpRequestProvider implements IHttpRequestProvider {
  async fetch<T>(url: string, options: RequestInit, noResponse?: boolean) {
    const resp = await tracedFetch(url, options);

    if (noResponse) {
      return null;
    }

    return (await resp.json()) as T;
  }
}
