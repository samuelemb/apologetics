import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { hash } from "bcryptjs";

import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { EmailDeliveryError, sendVerificationEmail } from "@/lib/resend";
import { prisma } from "@/lib/prisma";
import {
  emailVerificationSchema,
  publicRegistrationSchema,
  resendVerificationSchema,
  type EmailVerificationInput,
  type PublicRegistrationInput,
} from "@/schemas/public-account";

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const PASSWORD_HASH_ROUNDS = 12;

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
