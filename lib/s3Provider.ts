import * as AWS from 'aws-sdk';
import { merge } from 'lodash';
import { provideSingleton } from './ioc';

const s3 = new AWS.S3();

export const S3_PROVIDER_SYMBOL = Symbol('IS3Provider');

export interface IS3Provider {
  deleteObjects(bucket: string, keys: string[]): Promise<any>;
  getObject(fileParams: FileParams): Promise<GetObjectResult>;
  headObject(fileParams: FileParams): Promise<any>;
  listObjects(bucket: string, prefix: string): Promise<ListObjectsResult>;
  putObject(fileParams: FileParams, data: any, isPublic?: boolean): Promise<any>;
  signedGetUrl(fileParams: FileParams, downloadAsFilename: string, expiration: number): string;
  signedPutUrl(fileParams: FileParams, contentType: string, expiration: number): string;
}

@provideSingleton(S3_PROVIDER_SYMBOL)
export class S3Provider implements IS3Provider {
  putObject(fileParams: FileParams, data: any, isPublic?: boolean): Promise<any> {
    if (isPublic) {
      fileParams = merge(fileParams, {
        ACL: 'public-read',
        CacheControl: 'no-cache'
      });
    }

    return s3.putObject(merge(fileParams, {
      Body: data
    })).promise();
  }

  deleteObjects(bucket: string, keys: string[]) {
    return s3.deleteObjects({
      Bucket: bucket,
      Delete: {
        Objects: keys.map(key => {
          return {
            Key: key
          }
        })
      }
    }).promise();
  }

  listObjects(bucket: string, prefix: string) {
    return s3.listObjectsV2({
      Bucket: bucket,
      Prefix: prefix
    }).promise() as Promise<ListObjectsResult>;
  }

  getObject(fileParams: FileParams): Promise<any> {
    return s3.getObject(fileParams).promise();
  }

  headObject(fileParams: FileParams): Promise<any> {
    return s3.headObject(fileParams).promise();
  }

  signedGetUrl(fileParams: FileParams, downloadAsFilename: string, expiration: number) {
    return s3.getSignedUrl('getObject', merge(fileParams, {
      ResponseContentDisposition: `attachment; filename=${downloadAsFilename}`,
      Expires: expiration
    }));
  }

  signedPutUrl(fileParams: FileParams, contentType: string, expiration: number) {
    return s3.getSignedUrl('putObject', merge(fileParams, {
      Expires: expiration,
      ContentType: contentType
    }));
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
