export interface CloudflareEnv {
  DB: D1Database;
  MANUAL_IMAGES: R2Bucket;
  SESSION_SECRET: string;
}
