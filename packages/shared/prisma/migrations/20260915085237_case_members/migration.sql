-- CreateEnum
CREATE TYPE "CaseMemberRole" AS ENUM ('LEAD', 'MEMBER');

-- CreateTable
CREATE TABLE "CaseMember" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "CaseMemberRole" NOT NULL DEFAULT 'MEMBER',
    "addedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseMember_userId_idx" ON "CaseMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseMember_caseId_userId_key" ON "CaseMember"("caseId", "userId");

-- AddForeignKey
ALTER TABLE "CaseMember" ADD CONSTRAINT "CaseMember_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMember" ADD CONSTRAINT "CaseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMember" ADD CONSTRAINT "CaseMember_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every existing case gets its assigned lawyer as the LEAD member
INSERT INTO "CaseMember" ("id", "caseId", "userId", "role", "addedById", "createdAt")
SELECT gen_random_uuid(), c."id", c."lawyerId", 'LEAD', c."lawyerId", CURRENT_TIMESTAMP
FROM "Case" c
ON CONFLICT ("caseId", "userId") DO NOTHING;
