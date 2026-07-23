ALTER TABLE "PasswordResetToken" RENAME COLUMN "tokenHash" TO "codeHash";
ALTER TABLE "PasswordResetToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PasswordResetToken" ADD COLUMN "lastSentAt" TIMESTAMP(3);

DROP INDEX "PasswordResetToken_tokenHash_key";
