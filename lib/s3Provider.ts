import {
  S3Client,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  StorageClass
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { merge } from 'lodash';
import { provideSingleton } from './ioc';
import { Config } from './config';

const s3 = new S3Client({
  region: Config.region,
  useAccelerateEndpoint: true
});

export const S3_PROVIDER_SYMBOL = Symbol('IS3Provider');

export interface IS3Provider {
  deleteObjects(bucket: string, keys: string[]): Promise<void>;
  getObject(fileParams: FileParams): Promise<GetObjectResult>;
  headObject(fileParams: FileParams): Promise<void>;
  listObjects(bucket: string, prefix: string): Promise<ListObjectsResult>;
  putObject(fileParams: FileParams, data: string | Buffer, isPublic?: boolean): Promise<void>;
  signedGetUrl(
    fileParams: FileParams,
    downloadAsFilename: string,
    expiration: number
  ): Promise<string>;
  signedPutUrl(fileParams: FileParams, contentType: string, expiration: number): Promise<string>;
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

    await s3.send(
      new PutObjectCommand(
        merge(fileParams, {
          Body: data,
          StorageClass: StorageClass.INTELLIGENT_TIERING
        })
      )
    );
  }

  async deleteObjects(bucket: string, keys: string[]) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map(key => {
            return {
              Key: key
            };
          })
        }
      })
    );
  }

  async listObjects(bucket: string, prefix: string) {
    const resp = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix
      })
    );

    if (!resp || !resp.Contents) {
      throw new Error(`No data returned for listObjectsV2, prefix: ${prefix}`);
    }

    return resp;
  }

  async getObject(fileParams: FileParams) {
    return {
      Body: Buffer.from(
        await (await s3.send(new GetObjectCommand(fileParams))).Body.transformToByteArray()
      )
    };
  }

  async headObject(fileParams: FileParams) {
    await s3.send(new HeadObjectCommand(fileParams));
  }

  signedGetUrl(fileParams: FileParams, downloadAsFilename: string, expiresIn: number) {
    return getSignedUrl(
      s3,
      new GetObjectCommand(
        merge(fileParams, {
          ResponseContentDisposition: `attachment; filename=${downloadAsFilename}`
        })
      ),
      {
        expiresIn
      }
    );
  }

  signedPutUrl(fileParams: FileParams, contentType: string, expiresIn: number) {
    return getSignedUrl(
      s3,
      new PutObjectCommand(
        merge(fileParams, {
          ContentType: contentType,
          StorageClass: StorageClass.INTELLIGENT_TIERING
        })
      ),
      {
        expiresIn
      }
    );
  }
}

export interface GetObjectResult {
  Body: Buffer;
}

export interface ListObjectsResult {
  Contents?: Array<{
    Key?: string;
  }>;
}

export interface FileParams {
  Bucket: string;
  Key: string;
}
