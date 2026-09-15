import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import type { Env } from '../config/env';

export interface UploadInput {
  key: string;
  body: Buffer;
  mimeType: string;
  size: number;
}

/** Thin wrapper around the MinIO (S3-compatible) client. */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: MinioClient;
  readonly bucket: string;
  private readonly publicBaseUrl: string;

  /** Objects under this prefix are anonymously readable (used for post cover images). */
  static readonly PUBLIC_PREFIX = 'public/';

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('MINIO_BUCKET', { infer: true });
    const useSSL = config.get('MINIO_USE_SSL', { infer: true });
    this.publicBaseUrl =
      config.get('MINIO_PUBLIC_URL', { infer: true }) ??
      `${useSSL ? 'https' : 'http'}://${config.get('MINIO_ENDPOINT', { infer: true })}:${config.get('MINIO_PORT', { infer: true })}`;
    this.client = new MinioClient({
      endPoint: config.get('MINIO_ENDPOINT', { infer: true }),
      port: config.get('MINIO_PORT', { infer: true }),
      useSSL: config.get('MINIO_USE_SSL', { infer: true }),
      accessKey: config.get('MINIO_ACCESS_KEY', { infer: true }),
      secretKey: config.get('MINIO_SECRET_KEY', { infer: true }),
    });
  }

  /** Makes sure the bucket exists; never crashes the API when MinIO is down at boot. */
  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket "${this.bucket}"`);
      } else {
        this.logger.log(`Using bucket "${this.bucket}"`);
      }
      await this.client.setBucketPolicy(this.bucket, JSON.stringify(this.publicReadPolicy()));
    } catch (error) {
      this.logger.warn(`MinIO not reachable (${(error as Error).message}); uploads will fail until it is up`);
    }
  }

  async upload(input: UploadInput): Promise<void> {
    await this.client.putObject(this.bucket, input.key, input.body, input.size, {
      'Content-Type': input.mimeType,
    });
  }

  /** Presigned GET URL, valid for `expirySeconds` (default 5 minutes). */
  presignedGetUrl(key: string, downloadName?: string, expirySeconds = 300): Promise<string> {
    const headers = downloadName
      ? { 'response-content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}` }
      : undefined;
    return this.client.presignedGetObject(this.bucket, key, expirySeconds, headers);
  }

  /** Uploads under `public/` and returns the browser URL. */
  async uploadPublic(input: UploadInput): Promise<string> {
    const key = input.key.startsWith(StorageService.PUBLIC_PREFIX) ? input.key : `${StorageService.PUBLIC_PREFIX}${input.key}`;
    await this.upload({ ...input, key });
    return `${this.publicBaseUrl}/${this.bucket}/${key}`;
  }

  private publicReadPolicy() {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/${StorageService.PUBLIC_PREFIX}*`],
        },
      ],
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
