-- The old client-settable "image_url" (never used by the app) becomes a server-generated storage key.
-- Any value it held was arbitrary client input, not a stored file, so it is cleared.
ALTER TABLE "products" RENAME COLUMN "image_url" TO "image_key";
UPDATE "products" SET "image_key" = NULL;
