/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LambdaProxyEvent {
  httpMethod: string;
  headers: any;
  body: any;
  path: string;
  pathParameters: any;
  queryStringParameters: any;
  requestContext: any;
}
