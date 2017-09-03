import { LambdaProxyCallback } from './lambdaProxyCallback';

export class HttpResponse {
  private data: any;
  private statusCode: number;
  private headers = {
    'Access-Control-Allow-Headers': 'Content-Type,api-key',
    'Access-Control-Expose-Headers': 'api-key',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH'
  };

  constructor(private callback: LambdaProxyCallback) {
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
    if (this.callback) {
      this.callback(null, {
        body: JSON.stringify(this.data),
        headers: this.headers,
        statusCode: this.statusCode,
      });

      this.callback = null;
    }
  }
}
