-- CreateEnum
CREATE TYPE "ServiceRequestType" AS ENUM ('LAWYER', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('NEW', 'ACCEPTED', 'REJECTED', 'CONVERTED');

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "type" "ServiceRequestType" NOT NULL,
    "caseType" "CaseType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'NEW',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "assignedCaseId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_assignedCaseId_key" ON "ServiceRequest"("assignedCaseId");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");

-- CreateIndex
CREATE INDEX "ServiceRequest_requesterId_idx" ON "ServiceRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ServiceRequest_type_idx" ON "ServiceRequest"("type");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_assignedCaseId_fkey" FOREIGN KEY ("assignedCaseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
