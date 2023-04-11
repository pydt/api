import { provideSingleton } from './ioc';
import fetch, { RequestInit } from 'node-fetch';

export const HTTP_REQUEST_PROVIDER_SYMBOL = Symbol('IHttpRequestProvider');

export interface IHttpRequestProvider {
  fetch<T>(url: string, options: RequestInit): Promise<T>;
}

@provideSingleton(HTTP_REQUEST_PROVIDER_SYMBOL)
export class HttpRequestProvider implements IHttpRequestProvider {
  async fetch<T>(url: string, options: RequestInit) {
    const resp = await fetch(url, options);
    return (await resp.json()) as T;
  }
}
