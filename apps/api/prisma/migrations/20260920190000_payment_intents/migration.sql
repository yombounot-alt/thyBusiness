-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "client_request_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GNF',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "order_ref" TEXT NOT NULL,
    "provider_operation_id" TEXT NOT NULL,
    "payment_url" TEXT NOT NULL,
    "provider_status" TEXT,
    "provider_message" TEXT,
    "payment_method" TEXT,
    "provider_reference" TEXT,
    "payer_info" TEXT,
    "checkout" JSONB NOT NULL,
    "sale_id" TEXT,
    "review_reason" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "intent_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "headers" JSONB NOT NULL,
    "raw_body" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_order_ref_key" ON "payment_intents"("order_ref");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_provider_operation_id_key" ON "payment_intents"("provider_operation_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_sale_id_key" ON "payment_intents"("sale_id");

-- CreateIndex
CREATE INDEX "payment_intents_status_expires_at_idx" ON "payment_intents"("status", "expires_at");

-- CreateIndex
CREATE INDEX "payment_intents_business_id_created_at_idx" ON "payment_intents"("business_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_business_id_client_request_id_key" ON "payment_intents"("business_id", "client_request_id");

-- CreateIndex
CREATE INDEX "payment_webhook_events_intent_id_idx" ON "payment_webhook_events"("intent_id");

-- CreateIndex
CREATE INDEX "payment_webhook_events_received_at_idx" ON "payment_webhook_events"("received_at");

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "payment_intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

