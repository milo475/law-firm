import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import type { Env } from '../config/env';

interface UploadInput {
  key: string;
  body: Buffer;
  mimeType: string;
  size: number;
}

/**
 * Thin wrapper around an S3-compatible object store.
 *
 * Production uses Cloudflare R2 (`region: 'auto'`, path-style addressing); local development
 * points the same client at MinIO. R2 has no bucket-policy API and buckets are created in the
 * Cloudflare dashboard, so bucket bootstrapping only runs outside production.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly isProduction: boolean;
  readonly bucket: string;
  /** Browser-facing base URL of the bucket root (R2 public URL or custom domain). */
  private readonly publicBaseUrl: string;

  /** Objects under this prefix are anonymously readable (used for post cover images). */
  static readonly PUBLIC_PREFIX = 'public/';

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('R2_BUCKET', { infer: true });
    this.publicBaseUrl = config.get('R2_PUBLIC_URL', { infer: true });
    this.isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.get('R2_ENDPOINT', { infer: true }),
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get('R2_ACCESS_KEY_ID', { infer: true }),
        secretAccessKey: config.get('R2_SECRET_ACCESS_KEY', { infer: true }),
      },
    });
  }

  /** Checks the bucket; never crashes the API when the object store is down at boot. */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Using bucket "${this.bucket}"`);
    } catch (error) {
      if (this.isProduction) {
        this.logger.warn(`Bucket "${this.bucket}" not reachable (${(error as Error).message}); uploads will fail until it is`);
        return;
      }
      await this.createLocalBucket(error as Error);
    }
  }

  async upload(input: UploadInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.mimeType,
        ContentLength: input.size,
      }),
    );
  }

  /** Presigned GET URL, valid for `expirySeconds` (default 5 minutes). */
  presignedGetUrl(key: string, downloadName?: string, expirySeconds = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: downloadName ? `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}` : undefined,
    });
    return getSignedUrl(this.client, command, { expiresIn: expirySeconds });
  }

  /** Uploads under `public/` and returns the browser URL. */
  async uploadPublic(input: UploadInput): Promise<string> {
    const key = input.key.startsWith(StorageService.PUBLIC_PREFIX) ? input.key : `${StorageService.PUBLIC_PREFIX}${input.key}`;
    await this.upload({ ...input, key });
    return `${this.publicBaseUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /** Development convenience: MinIO starts empty, so create the bucket and open up `public/`. */
  private async createLocalBucket(cause: Error): Promise<void> {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      await this.client.send(
        new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: JSON.stringify(this.publicReadPolicy()) }),
      );
      this.logger.log(`Created bucket "${this.bucket}"`);
    } catch (error) {
      this.logger.warn(`Object store not reachable (${cause.message} / ${(error as Error).message}); uploads will fail until it is up`);
    }
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
}
