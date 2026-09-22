-- DropForeignKey
ALTER TABLE "payment_intents" DROP CONSTRAINT "payment_intents_business_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_intents" DROP CONSTRAINT "payment_intents_created_by_fkey";

-- DropForeignKey
ALTER TABLE "payment_intents" DROP CONSTRAINT "payment_intents_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_webhook_events" DROP CONSTRAINT "payment_webhook_events_intent_id_fkey";

-- DropTable
DROP TABLE "payment_intents";

-- DropTable
DROP TABLE "payment_webhook_events";

