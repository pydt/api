/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LambdaProxyEvent {
  headers: any;
  body: any;
  pathParameters: any;
  queryStringParameters: any;
  requestContext: {
    http: {
      method: string;
      path: string;
      sourceIp: string;
    };
    connectionId: string;
    routeKey: string;
  };
}
