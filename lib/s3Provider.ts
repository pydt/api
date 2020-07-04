import * as AWS from 'aws-sdk';
import { merge } from 'lodash';
import { provideSingleton } from './ioc';

const s3 = new AWS.S3({
  useAccelerateEndpoint: true
});

export const S3_PROVIDER_SYMBOL = Symbol('IS3Provider');

export interface IS3Provider {
  deleteObjects(bucket: string, keys: string[]): Promise<void>;
  getObject(fileParams: FileParams): Promise<GetObjectResult>;
  headObject(fileParams: FileParams): Promise<void>;
  listObjects(bucket: string, prefix: string): Promise<ListObjectsResult>;
  putObject(fileParams: FileParams, data: string | Buffer, isPublic?: boolean): Promise<void>;
  signedGetUrl(fileParams: FileParams, downloadAsFilename: string, expiration: number): string;
  signedPutUrl(fileParams: FileParams, contentType: string, expiration: number): string;
}

@provideSingleton(S3_PROVIDER_SYMBOL)
export class S3Provider implements IS3Provider {
  async putObject(fileParams: FileParams, data: string | Buffer, isPublic?: boolean) {
    if (isPublic) {
      fileParams = merge(fileParams, {
        ACL: 'public-read',
        CacheControl: 'no-cache'
      });
    }

    await s3
      .putObject(
        merge(fileParams, {
          Body: data
        })
      )
      .promise();
  }

  async deleteObjects(bucket: string, keys: string[]) {
    await s3
      .deleteObjects({
        Bucket: bucket,
        Delete: {
          Objects: keys.map(key => {
            return {
              Key: key
            };
          })
        }
      })
      .promise();
  }

  listObjects(bucket: string, prefix: string) {
    return s3
      .listObjectsV2({
        Bucket: bucket,
        Prefix: prefix
      })
      .promise() as Promise<ListObjectsResult>;
  }

  async getObject(fileParams: FileParams) {
    return (await s3.getObject(fileParams).promise()) as GetObjectResult;
  }

  async headObject(fileParams: FileParams) {
    await s3.headObject(fileParams).promise();
  }

  signedGetUrl(fileParams: FileParams, downloadAsFilename: string, expiration: number) {
    return s3.getSignedUrl(
      'getObject',
      merge(fileParams, {
        ResponseContentDisposition: `attachment; filename=${downloadAsFilename}`,
        Expires: expiration
      })
    );
  }

  signedPutUrl(fileParams: FileParams, contentType: string, expiration: number) {
    return s3.getSignedUrl(
      'putObject',
      merge(fileParams, {
        Expires: expiration,
        ContentType: contentType
      })
    );
  }
}

export interface GetObjectResult {
  Body: Buffer;
}

export interface ListObjectsResult {
  Contents: Array<{
    Key: string;
  }>;
}

export interface FileParams {
  Bucket: string;
  Key: string;
}
