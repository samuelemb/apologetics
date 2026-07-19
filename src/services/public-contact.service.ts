import "server-only";

import { ContactMessageStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const RECENT_SUBMISSION_WINDOW_MS = 10 * 60 * 1000;
const MAX_RECENT_EMAIL_SUBMISSIONS = 3;

export type PublicContactInput = {
  name: unknown;
  email: unknown;
  phone?: unknown;
  subject?: unknown;
  message: unknown;
  website?: unknown;
};

export type PublicContactFieldErrors = Partial<
  Record<"name" | "email" | "phone" | "subject" | "message", string>
>;

type ValidatedPublicContactData = {
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
};

export type PublicContactValidationResult =
  | {
      success: true;
      data: ValidatedPublicContactData;
    }
  | {
      success: true;
      spam: true;
    }
  | {
      success: false;
      fieldErrors: PublicContactFieldErrors;
    };

export type PublicContactSubmissionResult = {
  id: string;
  createdAt: Date;
};

export class PublicContactRateLimitError extends Error {
  constructor() {
    super("Public contact submission rate limit reached.");
    this.name = "PublicContactRateLimitError";
  }
}

function normalizeSingleLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isPracticalEmailAddress(value: string) {
  if (value.length > 254 || /\s/.test(value)) {
    return false;
  }

  const atIndex = value.indexOf("@");

  if (atIndex <= 0 || atIndex !== value.lastIndexOf("@")) {
    return false;
  }

  const localPart = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);

  if (
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
  ) {
    return false;
  }

  const domainParts = domain.split(".");

  return (
    domain.length <= 253 &&
    domainParts.length >= 2 &&
    domainParts.every(
      (part) =>
        part.length >= 1 &&
        part.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(part),
    )
  );
}

function isHoneypotFilled(value: unknown) {
  if (value === undefined || value === null) {
    return false;
  }

  return typeof value !== "string" || value.length > 0;
}

export function validatePublicContactInput(
  input: PublicContactInput,
): PublicContactValidationResult {
  if (isHoneypotFilled(input.website)) {
    return { success: true, spam: true };
  }

  const fieldErrors: PublicContactFieldErrors = {};

  const name =
    typeof input.name === "string" ? normalizeSingleLine(input.name) : "";

  if (typeof input.name !== "string" || name.length < 2) {
    fieldErrors.name = "Enter a name of at least 2 characters.";
  } else if (name.length > 100) {
    fieldErrors.name = "Name must be 100 characters or fewer.";
  }

  const email =
    typeof input.email === "string"
      ? input.email.trim().toLowerCase()
      : "";

  if (typeof input.email !== "string" || !isPracticalEmailAddress(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  let phone: string | null = null;

  if (input.phone !== undefined) {
    if (typeof input.phone !== "string") {
      fieldErrors.phone = "Enter a valid phone number or leave this field blank.";
    } else {
      const normalizedPhone = input.phone.trim();

      if (normalizedPhone.length > 30) {
        fieldErrors.phone = "Phone number must be 30 characters or fewer.";
      } else if (normalizedPhone && !/^[0-9 +().-]+$/.test(normalizedPhone)) {
        fieldErrors.phone = "Use only common phone number characters.";
      } else {
        phone = normalizedPhone || null;
      }
    }
  }

  let subject: string | null = null;

  if (input.subject !== undefined) {
    if (typeof input.subject !== "string") {
      fieldErrors.subject = "Enter a valid subject or leave this field blank.";
    } else {
      const normalizedSubject = normalizeSingleLine(input.subject);

      if (normalizedSubject.length > 150) {
        fieldErrors.subject = "Subject must be 150 characters or fewer.";
      } else {
        subject = normalizedSubject || null;
      }
    }
  }

  const message =
    typeof input.message === "string"
      ? input.message.replace(/\r\n?/g, "\n").trim()
      : "";

  if (typeof input.message !== "string" || message.length < 20) {
    fieldErrors.message = "Message must be at least 20 characters.";
  } else if (message.length > 5000) {
    fieldErrors.message = "Message must be 5000 characters or fewer.";
  } else if (message.includes("\0")) {
    fieldErrors.message = "Message contains an unsupported character.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      name,
      email,
      phone,
      subject,
      message,
    },
  };
}

export async function createPublicContactMessage(
  input: ValidatedPublicContactData,
): Promise<PublicContactSubmissionResult> {
  const recentWindowStart = new Date(
    Date.now() - RECENT_SUBMISSION_WINDOW_MS,
  );
  const recentSubmissionCount = await prisma.contactMessage.count({
    where: {
      email: input.email,
      createdAt: {
        gte: recentWindowStart,
      },
    },
  });

  if (recentSubmissionCount >= MAX_RECENT_EMAIL_SUBMISSIONS) {
    throw new PublicContactRateLimitError();
  }

  return prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject: input.subject,
      message: input.message,
      status: ContactMessageStatus.NEW,
    },
    select: {
      id: true,
      createdAt: true,
    },
  });
}
