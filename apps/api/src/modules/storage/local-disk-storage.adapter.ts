import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StoragePort } from './storage.port';

@Injectable()
export class LocalDiskStorageAdapter implements StoragePort {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(config.get<string>('storage.localPath') ?? './uploads');
  }

  async put(key: string, body: Buffer): Promise<void> {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  /** Keys are generated server-side, but the adapter still refuses anything that escapes its root. */
  private resolve(key: string): string {
    const file = path.resolve(this.root, key);
    if (file !== this.root && !file.startsWith(this.root + path.sep)) {
      throw new Error(`Clé de stockage invalide : ${key}`);
    }
    return file;
  }
}
