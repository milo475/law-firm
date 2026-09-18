-- CreateEnum
CREATE TYPE "TestimonialStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TestimonialSource" AS ENUM ('PORTAL', 'MANUAL');

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" UUID NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorTitle" TEXT,
    "body" TEXT NOT NULL,
    "rating" INTEGER,
    "caseType" "CaseType",
    "status" "TestimonialStatus" NOT NULL DEFAULT 'PENDING',
    "source" "TestimonialSource" NOT NULL DEFAULT 'MANUAL',
    "authorUserId" UUID,
    "caseId" UUID,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentedAt" TIMESTAMP(3),
    "consentNote" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Testimonial_authorUserId_caseId_key" ON "Testimonial"("authorUserId", "caseId");

-- CreateIndex
CREATE INDEX "Testimonial_status_displayOrder_idx" ON "Testimonial"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "Testimonial_caseType_status_idx" ON "Testimonial"("caseType", "status");

-- CreateIndex
CREATE INDEX "Testimonial_isFeatured_status_idx" ON "Testimonial"("isFeatured", "status");

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
