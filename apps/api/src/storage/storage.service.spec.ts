import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createConfigMock } from '../common/testing/mocks';
import { StorageService } from './storage.service';

// Keep the real command classes (so their input can be asserted), swap only the client itself.
jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return { ...actual, S3Client: jest.fn(() => ({ send: jest.fn() })) };
});
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));

type MockClient = { send: jest.Mock };

function createService(overrides: Parameters<typeof createConfigMock>[0] = {}) {
  const service = new StorageService(createConfigMock(overrides));
  const client = (S3Client as unknown as jest.Mock).mock.results.at(-1)!.value as MockClient;
  return { service, client };
}

describe('StorageService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('talks to the S3 endpoint with R2 settings', () => {
    createService();
    expect(S3Client as unknown as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'auto',
        endpoint: 'http://localhost:9000',
        forcePathStyle: true,
        credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' },
      }),
    );
  });

  it('uploads with the content type and length', async () => {
    const { service, client } = createService();
    await service.upload({ key: 'cases/1/file.pdf', body: Buffer.from('x'), mimeType: 'application/pdf', size: 1 });
    const command = client.send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({ Bucket: 'test-bucket', Key: 'cases/1/file.pdf', ContentType: 'application/pdf', ContentLength: 1 });
  });

  it('puts public objects under public/ and returns the bucket-root URL (no bucket segment)', async () => {
    const { service, client } = createService({ R2_PUBLIC_URL: 'https://cdn.lawfirm.mn' });
    const url = await service.uploadPublic({ key: 'covers/a.png', body: Buffer.from('x'), mimeType: 'image/png', size: 1 });
    expect((client.send.mock.calls[0][0] as PutObjectCommand).input.Key).toBe('public/covers/a.png');
    expect(url).toBe('https://cdn.lawfirm.mn/public/covers/a.png');
  });

  it('does not prefix a key that already starts with public/', async () => {
    const { service, client } = createService();
    await service.uploadPublic({ key: 'public/covers/a.png', body: Buffer.from('x'), mimeType: 'image/png', size: 1 });
    expect((client.send.mock.calls[0][0] as PutObjectCommand).input.Key).toBe('public/covers/a.png');
  });

  it('signs a download URL with the attachment filename and expiry', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue('https://r2/signed');
    const { service } = createService();
    await expect(service.presignedGetUrl('cases/1/file.pdf', 'Гэрээ.pdf', 60)).resolves.toBe('https://r2/signed');
    const [, command, options] = (getSignedUrl as jest.Mock).mock.calls[0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect((command as GetObjectCommand).input.ResponseContentDisposition).toBe(
      `attachment; filename*=UTF-8''${encodeURIComponent('Гэрээ.pdf')}`,
    );
    expect(options).toEqual({ expiresIn: 60 });
  });

  it('signs a plain URL for 5 minutes when no download name is given', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue('https://r2/signed');
    const { service } = createService();
    await service.presignedGetUrl('cases/1/file.pdf');
    const [, command, options] = (getSignedUrl as jest.Mock).mock.calls[0];
    expect((command as GetObjectCommand).input.ResponseContentDisposition).toBeUndefined();
    expect(options).toEqual({ expiresIn: 300 });
  });

  it('deletes by key', async () => {
    const { service, client } = createService();
    await service.delete('cases/1/file.pdf');
    const command = client.send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({ Bucket: 'test-bucket', Key: 'cases/1/file.pdf' });
  });

  it('only checks the bucket when it exists', async () => {
    const { service, client } = createService();
    client.send.mockResolvedValue({});
    await service.onModuleInit();
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
  });

  it('creates the bucket and opens up public/ outside production', async () => {
    const { service, client } = createService();
    client.send.mockRejectedValueOnce(new Error('NotFound')).mockResolvedValue({});
    await service.onModuleInit();
    expect(client.send.mock.calls[1][0]).toBeInstanceOf(CreateBucketCommand);
    expect(client.send.mock.calls[2][0]).toBeInstanceOf(PutBucketPolicyCommand);
  });

  it('never creates a bucket in production (R2 buckets are made in the dashboard) and does not throw', async () => {
    const { service, client } = createService({ NODE_ENV: 'production' });
    client.send.mockRejectedValue(new Error('NoSuchBucket'));
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(client.send).toHaveBeenCalledTimes(1);
  });
});
