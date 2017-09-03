export interface LambdaProxyEvent {
  httpMethod: string;
  headers: any;
  body: any;
  path: string;
  pathParameters: any;
  queryStringParameters: any;
}
