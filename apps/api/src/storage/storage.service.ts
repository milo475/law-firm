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

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('MINIO_BUCKET', { infer: true });
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

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
