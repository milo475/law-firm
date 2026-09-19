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
 *
 * Two buckets, because the two kinds of object have opposite requirements:
 *
 * - `R2_BUCKET` is **private**. Client documents and task attachments live here and leave it only
 *   through a presigned URL that the API hands out after checking case access. Nothing in this
 *   bucket may ever be reachable over r2.dev or a public custom domain.
 * - `R2_PUBLIC_BUCKET` is **public**. Post covers and lawyer photos only; `R2_PUBLIC_URL` points at
 *   it. Anything written here is world-readable by design.
 *
 * With one bucket (local MinIO, where `R2_PUBLIC_BUCKET` is unset) the old layout still applies:
 * public objects go under `public/`, which is the only prefix the dev bucket policy opens.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly isProduction: boolean;
  /** Private bucket: client documents and task attachments. */
  readonly bucket: string;
  /** Public bucket: post covers and lawyer photos. Falls back to the private one for local MinIO. */
  readonly publicBucket: string;
  /** Browser-facing base URL of the public bucket root (R2 public URL or custom domain). */
  private readonly publicBaseUrl: string;

  /** Only used when both buckets are the same (local dev): the prefix the dev bucket policy opens. */
  static readonly PUBLIC_PREFIX = 'public/';

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('R2_BUCKET', { infer: true });
    this.publicBucket = config.get('R2_PUBLIC_BUCKET', { infer: true }) || this.bucket;
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

  /** Checks both buckets; never crashes the API when the object store is down at boot. */
  async onModuleInit(): Promise<void> {
    await this.checkBucket(this.bucket, 'private');
    if (this.publicBucket !== this.bucket) {
      await this.checkBucket(this.publicBucket, 'public');
    } else {
      this.logger.log(`Public objects share bucket "${this.bucket}" under "${StorageService.PUBLIC_PREFIX}" (no R2_PUBLIC_BUCKET set)`);
    }
  }

  private async checkBucket(bucket: string, kind: 'private' | 'public'): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
      this.logger.log(`Using ${kind} bucket "${bucket}"`);
    } catch (error) {
      if (this.isProduction) {
        this.logger.warn(`${kind} bucket "${bucket}" not reachable (${(error as Error).message}); uploads will fail until it is`);
        return;
      }
      await this.createLocalBucket(bucket, error as Error);
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

  /**
   * Writes a world-readable object (post cover, lawyer photo) and returns its browser URL.
   * A dedicated public bucket needs no prefix; the single-bucket fallback keeps `public/`.
   */
  async uploadPublic(input: UploadInput): Promise<string> {
    const separateBucket = this.publicBucket !== this.bucket;
    const key = separateBucket || input.key.startsWith(StorageService.PUBLIC_PREFIX)
      ? input.key
      : `${StorageService.PUBLIC_PREFIX}${input.key}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.publicBucket,
        Key: key,
        Body: input.body,
        ContentType: input.mimeType,
        ContentLength: input.size,
      }),
    );
    return `${this.publicBaseUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /**
   * Development convenience: MinIO starts empty, so create the bucket. The private bucket only
   * opens `public/` (the single-bucket fallback); a dedicated public bucket is opened whole.
   */
  private async createLocalBucket(bucket: string, cause: Error): Promise<void> {
    const wholeBucketIsPublic = bucket === this.publicBucket && bucket !== this.bucket;
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
      await this.client.send(
        new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(this.publicReadPolicy(bucket, wholeBucketIsPublic)) }),
      );
      this.logger.log(`Created bucket "${bucket}"`);
    } catch (error) {
      this.logger.warn(`Object store not reachable (${cause.message} / ${(error as Error).message}); uploads will fail until it is up`);
    }
  }

  private publicReadPolicy(bucket: string, wholeBucket: boolean) {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [wholeBucket ? `arn:aws:s3:::${bucket}/*` : `arn:aws:s3:::${bucket}/${StorageService.PUBLIC_PREFIX}*`],
        },
      ],
    };
  }
}
