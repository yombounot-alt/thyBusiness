export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/**
 * Where uploaded files (product photos for now) live. Swappable behind the STORAGE_DRIVER env var:
 * only a local-disk implementation exists for this MVP cycle; an S3/MinIO adapter can replace it
 * without touching the business code, which only ever handles opaque keys.
 */
export interface StoragePort {
  /** Stores [body] under [key], replacing whatever was there. */
  put(key: string, body: Buffer): Promise<void>;
  /** The stored bytes, or null when nothing exists under [key]. */
  get(key: string): Promise<Buffer | null>;
  /** Removes [key]; a missing key is not an error. */
  delete(key: string): Promise<void>;
}
