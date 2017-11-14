import { LambdaProxyPayload } from './lambdaProxyPayload';

export type LambdaProxyCallback = (error: any, result: LambdaProxyPayload) => void;
