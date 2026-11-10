-- An EDITOR writes and publishes posts and reaches nothing else. The value is only added here;
-- PostgreSQL forbids using a new enum value in the transaction that creates it.
ALTER TYPE "Role" ADD VALUE 'EDITOR';

-- A post's byline and its typist are now two different people. `authorId` keeps its old meaning —
-- the lawyer printed under the title — but may be empty, because an editor's name never goes
-- public. Who typed and who last saved is recorded separately.
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

ALTER TABLE "Post" ADD COLUMN     "createdById" UUID,
ADD COLUMN     "updatedById" UUID,
ALTER COLUMN "authorId" DROP NOT NULL;

-- Every post that exists today was typed by the lawyer in its byline.
UPDATE "Post" SET "createdById" = "authorId" WHERE "createdById" IS NULL;

ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
