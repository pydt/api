/* eslint-disable @typescript-eslint/no-explicit-any */
import { reduce } from 'lodash';
import { LambdaProxyEvent } from './lambdaProxyEvent';
import { EventEmitter } from 'events';
import type { Subsegment } from 'aws-xray-sdk';

export class HttpRequest extends EventEmitter {
  public body: any;
  public rawBody: any;
  public headers: Record<string, string>;
  public method: string;
  public params: any;
  public query: any;
  public user: string;
  public url: string;
  public subSegment: Subsegment;
  public sourceIp: string;
  // Set when the body isn't valid JSON (in practice, scanner bots); the router
  // answers 400 without logging.
  public invalidJsonBody = false;

  constructor(event: LambdaProxyEvent) {
    super();

    if (event.body) {
      this.rawBody = event.body;

      try {
        this.body = JSON.parse(event.body);
      } catch {
        this.invalidJsonBody = true;
      }
    }

    this.headers = reduce(
      event.headers || {},
      (result, value, key) => {
        result[key.toLowerCase()] = value;
        return result;
      },
      {}
    );

    const http = event.requestContext.http;
    this.method = http.method;
    this.params = event.pathParameters;
    this.query = event.queryStringParameters || {};
    this.url = http.path;
    this.sourceIp = http.sourceIp;
  }
}
