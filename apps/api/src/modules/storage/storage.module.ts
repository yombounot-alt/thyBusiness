import { Module } from '@nestjs/common';
import { LocalDiskStorageAdapter } from './local-disk-storage.adapter';
import { STORAGE_PROVIDER } from './storage.port';

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      // STORAGE_DRIVER only accepts "local" today (validated at startup).
      useClass: LocalDiskStorageAdapter,
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
