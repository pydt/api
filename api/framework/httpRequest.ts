import { LambdaProxyEvent } from './lambdaProxyEvent';
import { HttpResponse } from './httpResponse';
import * as _ from 'lodash';

export class HttpRequest {
  public body: any;
  public headers: any;
  public method: string;
  public params: any;
  public query: any;
  public user: string;
  public url: string;

  // HACK: We pass in response here to work around limitations in the TSOA framework,
  // when they make it easier to create your own templates for authentication we can
  // revisit this.
  constructor(event: LambdaProxyEvent, public response: HttpResponse) {
    if (event.body) {
      this.body = JSON.parse(event.body);
    }

    this.headers = _.reduce(event.headers || {}, (result, value, key) => {
      result[key.toLowerCase()] = value;
      return result;
    }, {});
    this.method = event.httpMethod;
    this.params = event.pathParameters;
    this.query = event.queryStringParameters || {};
    this.url = event.path;
  }
}
