/* eslint-disable @typescript-eslint/no-explicit-any */
import { LambdaProxyCallback } from './lambdaProxyCallback';
import { HttpRequest } from './httpRequest';
import { EventEmitter } from 'events';

export class HttpResponse extends EventEmitter {
  private data: any;
  private statusCode: number;
  private headers = {};

  constructor(private callback: LambdaProxyCallback, public req: HttpRequest) {
    super();
  }

  public json(data: any) {
    this.data = data;
    this.end();
  }

  public status(code: number) {
    this.statusCode = code;
    return this;
  }

  public addHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  public end() {
    this.emit('finish');

    if (this.callback) {
      this.callback(null, {
        body: JSON.stringify(this.data),
        headers: this.headers,
        statusCode: this.statusCode
      });

      this.callback = null;
    }
  }
}
