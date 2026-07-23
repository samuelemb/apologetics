ALTER TABLE "PasswordResetToken" ALTER COLUMN "codeHash" DROP NOT NULL;
ALTER TABLE "PasswordResetToken" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "PasswordResetToken" ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "PasswordResetToken_resetTokenHash_key" ON "PasswordResetToken"("resetTokenHash");
CREATE INDEX "PasswordResetToken_resetTokenExpiresAt_idx" ON "PasswordResetToken"("resetTokenExpiresAt");
