-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'AWAITING_CONFIRMATION';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "confirmedById" UUID,
ADD COLUMN     "paymentMarkedAt" TIMESTAMP(3),
ADD COLUMN     "paymentNote" TEXT,
ADD COLUMN     "paymentRejectedAt" TIMESTAMP(3),
ADD COLUMN     "paymentRejectionReason" TEXT;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
