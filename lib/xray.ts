import * as AWSXRay from 'aws-xray-sdk';

// Lambda tracing on its own only records each invocation's total time. These helpers add the calls
// made during a request as X-Ray subsegments, so a slow request shows where the time went. Outside
// Lambda (tests, local) there's no trace context and they quietly do nothing extra (see the
// context-missing strategy in config.ts).

// Records every call made with this AWS SDK v3 client (DynamoDB, S3, SNS, ...) as a subsegment.
export const traceAwsClient = <T extends Parameters<typeof AWSXRay.captureAWSv3Client>[0]>(
  client: T
): T => AWSXRay.captureAWSv3Client(client);

// fetch() that records the call as a subsegment named after the host. The SDK doesn't capture native
// fetch. Only the host is recorded: these URLs can carry secrets (Steam API key in the query, the
// token in a Discord webhook path).
export const tracedFetch = (url: string, init?: RequestInit): Promise<Response> => {
  let host = 'fetch';

  try {
    host = new URL(url).host;
  } catch {
    // Not a valid URL; fetch will throw and we'll record that
  }

  return AWSXRay.captureAsyncFunc(host, async subsegment => {
    try {
      const resp = await fetch(url, init);
      subsegment?.addAnnotation('httpStatus', resp.status);
      return resp;
    } catch (e) {
      subsegment?.addError(e as Error);
      throw e;
    } finally {
      subsegment?.close();
    }
  });
};
