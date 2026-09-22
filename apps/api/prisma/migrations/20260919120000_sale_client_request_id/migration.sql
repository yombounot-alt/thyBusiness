-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "client_request_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_business_id_client_request_id_key" ON "sales"("business_id", "client_request_id");
