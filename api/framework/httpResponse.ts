/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'events';
import { PYDT_METADATA_HASH } from '../../lib/metadata/metadata';
import { HttpRequest } from './httpRequest';
import { LambdaProxyCallback } from './lambdaProxyCallback';
import * as zlib from 'zlib';

export class HttpResponse extends EventEmitter {
  private data: any;
  private statusCode: number;
  private headers = {
    'Metadata-Hash': PYDT_METADATA_HASH
  };

  constructor(private callback: LambdaProxyCallback, public req: HttpRequest) {
    super();
  }

  public json(data: any) {
    this.data = data;
    this.end();
  }

  public status(code: number) {
    this.statusCode = code;
    return this;
  }

  public addHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  public end() {
    this.emit('finish');

    if (this.callback) {
      const compressed = this.compress(JSON.stringify(this.data));

      this.callback(null, {
        body: compressed.data,
        headers: {
          ...this.headers,
          ...(compressed.contentEncoding ? { 'Content-Encoding': compressed.contentEncoding } : {})
        },
        isBase64Encoded: !!compressed.contentEncoding,
        statusCode: this.statusCode
      });

      this.callback = null;
    }
  }

  private compress(jsonString: string): { data: string; contentEncoding?: string } {
    // Don't waste time compressing small stuff
    if (jsonString.length > 1024) {
      // Parse the acceptable encoding, if any
      const acceptEncodingHeader = this.req.headers['accept-encoding'] || '';

      // Build a set of acceptable encodings, there could be multiple
      const acceptableEncodings = new Set(
        acceptEncodingHeader
          .toLowerCase()
          .split(',')
          .map(str => str.trim())
      );

      if (acceptableEncodings.has('br')) {
        return {
          data: zlib.brotliCompressSync(jsonString).toString('base64'),
          contentEncoding: 'br'
        };
      }

      if (acceptableEncodings.has('gzip')) {
        return {
          data: zlib.gzipSync(jsonString).toString('base64'),
          contentEncoding: 'gzip'
        };
      }

      if (acceptableEncodings.has('deflate')) {
        return {
          data: zlib.deflateSync(jsonString).toString('base64'),
          contentEncoding: 'deflate'
        };
      }
    }

    return {
      data: jsonString
    };
  }
}
