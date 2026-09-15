-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "familyId" UUID,
ADD COLUMN     "rotatedAt" TIMESTAMP(3);

-- Tokens issued before families existed each start their own session family
UPDATE "RefreshToken" SET "familyId" = "id" WHERE "familyId" IS NULL;

ALTER TABLE "RefreshToken" ALTER COLUMN "familyId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
