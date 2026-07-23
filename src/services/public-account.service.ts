import "server-only";

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import { hash } from "bcryptjs";

import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { EmailDeliveryError, sendPasswordResetEmail, sendVerificationEmail } from "@/lib/resend";
import { prisma } from "@/lib/prisma";
import {
  emailVerificationSchema,
  publicRegistrationSchema,
  resendVerificationSchema,
  publicProfileSchema,
  type EmailVerificationInput,
  type PublicProfileInput,
  type PublicRegistrationInput,
  passwordResetRequestSchema,
  passwordResetSchema,
  type PasswordResetInput,
  type PasswordResetRequestInput,
  passwordResetCodeSchema,
  type PasswordResetCodeInput,
} from "@/schemas/public-account";

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const PASSWORD_HASH_ROUNDS = 12;
const PASSWORD_RESET_EXPIRY_MS = 30 * 60 * 1000;
const MAX_PASSWORD_RESET_ATTEMPTS = 5;
const PASSWORD_RESET_AUTHORIZATION_EXPIRY_MS = 10 * 60 * 1000;

export class PublicAccountError extends Error {
  constructor(
    public readonly code:
      | "ACCOUNT_EXISTS"
      | "NOT_PENDING_VERIFICATION"
      | "RESEND_TOO_SOON"
      | "INVALID_CODE"
      | "CODE_EXPIRED"
      | "TOO_MANY_ATTEMPTS"
      | "EMAIL_DELIVERY_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "PublicAccountError";
  }
}

function createVerificationCode(): string {
  return randomInt(0, 10_000).toString().padStart(4, "0");
}

function hashVerificationCode(code: string): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new PublicAccountError(
      "EMAIL_DELIVERY_FAILED",
      "Account verification is not configured.",
    );
  }

  return createHmac("sha256", secret).update(code).digest("hex");
}

function codesMatch(actual: string, expected: string): boolean {
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

async function deliverCode(user: { id: string; email: string; name: string }, code: string) {
  try {
    await sendVerificationEmail({ email: user.email, name: user.name, code });
    await prisma.emailVerificationCode.update({
      where: { userId: user.id },
      data: { lastSentAt: new Date() },
    });
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      throw new PublicAccountError(
        "EMAIL_DELIVERY_FAILED",
        "We could not send a verification email. Please try again shortly.",
      );
    }

    throw error;
  }
}

export async function registerPublicUser(input: PublicRegistrationInput) {
  const parsed = publicRegistrationSchema.parse(input);
  const code = createVerificationCode();
  const now = new Date();
  const passwordHash = await hash(parsed.password, PASSWORD_HASH_ROUNDS);

  const user = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.user.findUnique({
      where: { email: parsed.email },
      select: { id: true },
    });

    if (existing) {
      throw new PublicAccountError(
        "ACCOUNT_EXISTS",
        "An account already exists for this email address.",
      );
    }

    return transaction.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerificationCode: {
          create: {
            codeHash: hashVerificationCode(code),
            expiresAt: new Date(now.getTime() + CODE_EXPIRY_MS),
          },
        },
      },
      select: { id: true, email: true, name: true },
    });
  });

  await deliverCode(user, code);
  return { email: user.email };
}

export async function resendPublicVerification(emailInput: unknown) {
  const { email } = resendVerificationSchema.parse(emailInput);
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerificationCode: true,
    },
  });

  if (
    !user ||
    user.role !== UserRole.USER ||
    user.status !== UserStatus.PENDING_VERIFICATION ||
    !user.emailVerificationCode
  ) {
    throw new PublicAccountError(
      "NOT_PENDING_VERIFICATION",
      "This account is not awaiting email verification.",
    );
  }

  const now = new Date();
  const lastSentAt = user.emailVerificationCode.lastSentAt;
  if (lastSentAt && now.getTime() - lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new PublicAccountError(
      "RESEND_TOO_SOON",
      "Please wait one minute before requesting another code.",
    );
  }

  const code = createVerificationCode();
  await prisma.emailVerificationCode.update({
    where: { userId: user.id },
    data: {
      codeHash: hashVerificationCode(code),
      expiresAt: new Date(now.getTime() + CODE_EXPIRY_MS),
      attempts: 0,
    },
  });

  await deliverCode(user, code);
}

export async function verifyPublicUserEmail(input: EmailVerificationInput) {
  const parsed = emailVerificationSchema.parse(input);
  const now = new Date();

  const result = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { email: parsed.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        emailVerificationCode: true,
      },
    });

    if (
      !user ||
      user.role !== UserRole.USER ||
      user.status !== UserStatus.PENDING_VERIFICATION ||
      !user.emailVerificationCode
    ) {
      throw new PublicAccountError(
        "NOT_PENDING_VERIFICATION",
        "This account is not awaiting email verification.",
      );
    }

    if (user.emailVerificationCode.expiresAt <= now) {
      throw new PublicAccountError(
        "CODE_EXPIRED",
        "This verification code has expired. Request a new code.",
      );
    }

    if (user.emailVerificationCode.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new PublicAccountError(
        "TOO_MANY_ATTEMPTS",
        "Too many incorrect codes. Request a new code.",
      );
    }

    if (!codesMatch(hashVerificationCode(parsed.code), user.emailVerificationCode.codeHash)) {
      await transaction.emailVerificationCode.update({
        where: { userId: user.id },
        data: { attempts: { increment: 1 } },
      });
      return { verified: false as const };
    }

    const verifiedAt = new Date();
    const verifiedUser = await transaction.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: verifiedAt,
        emailVerificationCode: { delete: true },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        userId: verifiedUser.id,
        action: "USER_EMAIL_VERIFIED",
        entityType: "User",
        entityId: verifiedUser.id,
      },
    });

    return { verified: true as const, user: verifiedUser };
  });

  if (!result.verified) {
    throw new PublicAccountError(
      "INVALID_CODE",
      "The verification code is incorrect.",
    );
  }

  return result.user;
}

export async function updatePublicUserProfile(
  userId: string,
  input: PublicProfileInput,
) {
  const parsed = publicProfileSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
    },
  });

  if (
    !user ||
    user.role !== UserRole.USER ||
    user.status !== UserStatus.ACTIVE ||
    !user.emailVerifiedAt
  ) {
    throw new PublicAccountError(
      "NOT_PENDING_VERIFICATION",
      "Your account is not available for profile updates.",
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.name },
    select: { id: true, name: true },
  });

  if (updated.name !== user.name) {
    await prisma.auditLog.create({
      data: {
        userId: updated.id,
        action: "USER_PROFILE_UPDATED",
        entityType: "User",
        entityId: updated.id,
        metadata: { changedFields: ["name"] },
      },
    });
  }

  return updated;
}

export async function requestPasswordReset(input: PasswordResetRequestInput) {
  const { email } = passwordResetRequestSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, role: true, status: true, emailVerifiedAt: true } });
  if (!user || user.role !== UserRole.USER || user.status !== UserStatus.ACTIVE || !user.emailVerifiedAt) return;

  const code = createVerificationCode();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
  await prisma.passwordResetToken.upsert({ where: { userId: user.id }, create: { userId: user.id, codeHash: hashVerificationCode(code), expiresAt, lastSentAt: new Date() }, update: { codeHash: hashVerificationCode(code), expiresAt, attempts: 0, lastSentAt: new Date() } });

  try {
    await sendPasswordResetEmail({ email: user.email, name: user.name, code });
  } catch (error) {
    await prisma.passwordResetToken.delete({ where: { userId: user.id } }).catch(() => undefined);
    if (error instanceof EmailDeliveryError || error instanceof PublicAccountError) throw new PublicAccountError("EMAIL_DELIVERY_FAILED", "We could not send a reset email. Please try again shortly.");
    throw error;
  }
}

export async function resendPasswordResetCode(input: PasswordResetRequestInput) {
  const { email } = passwordResetRequestSchema.parse(input);
  const existing = await prisma.passwordResetToken.findFirst({ where: { user: { email, role: UserRole.USER, status: UserStatus.ACTIVE, emailVerifiedAt: { not: null } } }, select: { lastSentAt: true } });
  if (existing?.lastSentAt && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) throw new PublicAccountError("RESEND_TOO_SOON", "Please wait one minute before requesting another code.");
  return requestPasswordReset({ email });
}

export async function verifyPasswordResetCode(input: PasswordResetCodeInput) {
  const parsed = passwordResetCodeSchema.parse(input);
  const authorizationToken = randomBytes(32).toString("base64url");
  await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({ where: { email: parsed.email }, select: { id: true, role: true, status: true, emailVerifiedAt: true, passwordResetToken: true } });
    const resetToken = user?.passwordResetToken;
    if (!user || !resetToken || !resetToken.codeHash || resetToken.expiresAt <= new Date() || resetToken.attempts >= MAX_PASSWORD_RESET_ATTEMPTS || user.role !== UserRole.USER || user.status !== UserStatus.ACTIVE || !user.emailVerifiedAt) throw new PublicAccountError("INVALID_CODE", "This password reset code is invalid or has expired.");
    if (!codesMatch(hashVerificationCode(parsed.code), resetToken.codeHash)) {
      await transaction.passwordResetToken.update({ where: { id: resetToken.id }, data: { attempts: { increment: 1 } } });
      throw new PublicAccountError("INVALID_CODE", "The reset code is incorrect.");
    }
    await transaction.passwordResetToken.update({ where: { id: resetToken.id }, data: { codeHash: null, resetTokenHash: hashVerificationCode(authorizationToken), resetTokenExpiresAt: new Date(Date.now() + PASSWORD_RESET_AUTHORIZATION_EXPIRY_MS) } });
  }, { isolationLevel: "Serializable" });
  return { token: authorizationToken };
}

export async function resetPassword(input: PasswordResetInput) {
  const parsed = passwordResetSchema.parse(input);
  const passwordHash = await hash(parsed.password, PASSWORD_HASH_ROUNDS);
  await prisma.$transaction(async (transaction) => {
    const resetToken = await transaction.passwordResetToken.findUnique({ where: { resetTokenHash: hashVerificationCode(parsed.token) }, include: { user: { select: { id: true, role: true, status: true, emailVerifiedAt: true } } } });
    if (!resetToken || !resetToken.resetTokenExpiresAt || resetToken.resetTokenExpiresAt <= new Date() || resetToken.user.role !== UserRole.USER || resetToken.user.status !== UserStatus.ACTIVE || !resetToken.user.emailVerifiedAt) throw new PublicAccountError("INVALID_CODE", "This password reset authorization is invalid or has expired.");
    await transaction.user.update({ where: { id: resetToken.user.id }, data: { passwordHash } });
    await transaction.passwordResetToken.delete({ where: { id: resetToken.id } });
    await transaction.auditLog.create({ data: { userId: resetToken.userId, action: "USER_PASSWORD_RESET", entityType: "User", entityId: resetToken.userId } });
  }, { isolationLevel: "Serializable" });
}
