import {
  S3Client,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  StorageClass,
  ListObjectVersionsCommand,
  ObjectVersion
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { merge } from 'lodash';
import { provideSingleton } from './ioc';
import { Config } from './config';
import { traceAwsClient } from './xray';

// The api's own S3 calls run in the bucket's region, so they use the regular endpoint: Transfer
// Acceleration only helps far-away clients, costs extra per GB, and its outages (504s, see forum
// #14499) shouldn't take server-side reads and writes down with them.
const s3 = traceAwsClient(
  new S3Client({
    region: Config.region
  })
);

// Only for signing URLs handed to players (uploads and downloads from wherever they are).
// Signing is local, so this client never makes requests itself.
const s3Accelerated = new S3Client({
  region: Config.region,
  useAccelerateEndpoint: true
});

export interface SignedUrlOptions {
  // Sign for the regular endpoint instead of Transfer Acceleration (a fallback when it's down)
  accelerate?: boolean;
}

export const S3_PROVIDER_SYMBOL = Symbol('IS3Provider');

export interface IS3Provider {
  deleteObjects(bucket: string, keys: string[]): Promise<void>;
  getObject(fileParams: FileParams): Promise<GetObjectResult>;
  headObject(fileParams: FileParams): Promise<void>;
  listObjects(bucket: string, prefix: string): Promise<ListObjectsResult>;
  putObject(fileParams: FileParams, data: string | Buffer, isPublic?: boolean): Promise<void>;
  getLatestVersionInfo(fileParams: FileParams): Promise<ObjectVersion | undefined>;
  signedGetUrl(
    fileParams: FileParams,
    downloadAsFilename: string,
    expiration: number
  ): Promise<string>;
  signedPutUrl(
    fileParams: FileParams,
    contentType: string,
    expiration: number,
    options?: SignedUrlOptions
  ): Promise<string>;
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

    if (!resp) {
      throw new Error(`No data returned for listObjectsV2, prefix: ${prefix}`);
    }

    // S3 leaves Contents out when nothing matches the prefix (e.g. a finished
    // game with no map images); treat that as an empty list.
    return { ...resp, Contents: resp.Contents || [] };
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

  async getLatestVersionInfo(fileParams: FileParams) {
    const versions = await s3.send(
      new ListObjectVersionsCommand({
        Bucket: fileParams.Bucket,
        Prefix: fileParams.Key
      })
    );

    return versions.Versions?.find(x => x.IsLatest);
  }

  signedGetUrl(fileParams: FileParams, downloadAsFilename: string, expiresIn: number) {
    return getSignedUrl(
      s3Accelerated,
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

  signedPutUrl(
    fileParams: FileParams,
    contentType: string,
    expiresIn: number,
    options: SignedUrlOptions = {}
  ) {
    return getSignedUrl(
      options.accelerate === false ? s3 : s3Accelerated,
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
  // true when S3 stopped at its page limit (1000 keys) and more match the prefix
  IsTruncated?: boolean;
}

export interface FileParams {
  Bucket: string;
  Key: string;
}
