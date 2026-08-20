import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const UPLOAD_ROOT = join(process.cwd(), 'uploads');
const PRESIGNED_URL_TTL_SECONDS = 3600;

// Switches attachment storage between local disk (default — fine for a
// single dev machine) and S3 (or any S3-compatible endpoint, e.g. MinIO
// for local testing). Attachment.url stores a bare storage key either
// way; resolveUrl() turns that key into whatever the frontend can
// actually fetch — a static-served relative path for local, a
// short-lived presigned GET URL for S3 — so switching drivers never
// requires a data migration.
@Injectable()
export class StorageService {
  private readonly driver: 'local' | 's3';
  private readonly s3Client?: S3Client;
  private readonly bucket?: string;

  constructor() {
    this.driver = process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';
    if (this.driver === 's3') {
      this.bucket = requireEnv('S3_BUCKET');
      this.s3Client = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        credentials:
          process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
              }
            : undefined,
      });
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.driver === 's3') {
      await this.s3Client!.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
      );
      return;
    }
    const path = join(UPLOAD_ROOT, key);
    if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async resolveUrl(key: string): Promise<string> {
    if (this.driver === 's3') {
      return getSignedUrl(this.s3Client!, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
        expiresIn: PRESIGNED_URL_TTL_SECONDS,
      });
    }
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    if (this.driver === 's3') {
      await this.s3Client!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return;
    }
    const path = join(UPLOAD_ROOT, key);
    await unlink(path).catch(() => undefined);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name} for STORAGE_DRIVER=s3.`);
  return value;
}
