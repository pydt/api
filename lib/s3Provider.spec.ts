import 'reflect-metadata';
import { expect } from 'chai';
import { before, describe, it } from 'mocha';
import { S3Provider } from './s3Provider';

describe('S3Provider.signedPutUrl', () => {
  // Signing is local, so fake credentials are enough (nothing is sent)
  before(() => {
    process.env.AWS_ACCESS_KEY_ID = 'AKIATESTTESTTESTTEST';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    delete process.env.AWS_SESSION_TOKEN;
    delete process.env.AWS_PROFILE;
  });

  const file = { Bucket: 'test-civx-saves', Key: 'game-id/000123.CivXSave' };
  const sign = (accelerate?: boolean) =>
    new S3Provider().signedPutUrl(
      file,
      'application/octet-stream',
      300,
      accelerate === undefined ? undefined : { accelerate }
    );

  it('signs for Transfer Acceleration by default', async () => {
    const url = new URL(await sign());

    expect(url.host).to.equal('test-civx-saves.s3-accelerate.amazonaws.com');
    expect(url.pathname).to.equal('/game-id/000123.CivXSave');
    expect(url.searchParams.get('X-Amz-Expires')).to.equal('300');
  });

  it('signs the same upload for the regular endpoint when asked', async () => {
    const accelerated = new URL(await sign(true));
    const regular = new URL(await sign(false));

    expect(regular.host).to.equal('test-civx-saves.s3.us-east-1.amazonaws.com');
    expect(regular.pathname).to.equal(accelerated.pathname);

    for (const param of ['X-Amz-Expires', 'X-Amz-SignedHeaders', 'x-amz-storage-class']) {
      expect(regular.searchParams.get(param), param).to.equal(accelerated.searchParams.get(param));
    }

    // Signed separately, since the host is part of the signature
    expect(regular.searchParams.get('X-Amz-Signature')).to.not.equal(
      accelerated.searchParams.get('X-Amz-Signature')
    );
  });
});
