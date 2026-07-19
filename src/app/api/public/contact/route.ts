import { NextResponse, type NextRequest } from "next/server";

import {
  createPublicContactMessage,
  PublicContactRateLimitError,
  type PublicContactInput,
  validatePublicContactInput,
} from "@/services/public-contact.service";

const MAX_REQUEST_BODY_BYTES = 16 * 1024;
const COOLDOWN_COOKIE_NAME = "apologetics_contact_cooldown";
const COOLDOWN_SECONDS = 60;
const SUCCESS_MESSAGE = "Thank you. Your message has been received.";
const noStoreHeaders = {
  "Cache-Control": "no-store",
};

function invalidRequestResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "The request could not be processed.",
    },
    {
      status: 400,
      headers: noStoreHeaders,
    },
  );
}

function successResponse() {
  return NextResponse.json(
    {
      success: true,
      message: SUCCESS_MESSAGE,
    },
    {
      status: 201,
      headers: noStoreHeaders,
    },
  );
}

function rateLimitResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "Please wait before sending another message.",
    },
    {
      status: 429,
      headers: noStoreHeaders,
    },
  );
}

function toPublicContactInput(value: unknown): PublicContactInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    name: record.name,
    email: record.email,
    phone: record.phone,
    subject: record.subject,
    message: record.message,
    website: record.website,
  };
}

export async function POST(request: NextRequest) {
  const contentLengthHeader = request.headers.get("content-length");

  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);

    if (
      !Number.isInteger(contentLength) ||
      contentLength < 0 ||
      contentLength > MAX_REQUEST_BODY_BYTES
    ) {
      return invalidRequestResponse();
    }
  }

  const origin = request.headers.get("origin");

  if (origin !== null && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      {
        success: false,
        message: "The request is not allowed.",
      },
      {
        status: 403,
        headers: noStoreHeaders,
      },
    );
  }

  const hasCooldownCookie = Boolean(
    request.cookies.get(COOLDOWN_COOKIE_NAME)?.value,
  );
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    return invalidRequestResponse();
  }

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return invalidRequestResponse();
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES) {
    return invalidRequestResponse();
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(rawBody) as unknown;
  } catch {
    return invalidRequestResponse();
  }

  const input = toPublicContactInput(parsedBody);

  if (!input) {
    return invalidRequestResponse();
  }

  const validation = validatePublicContactInput(input);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: validation.fieldErrors,
      },
      {
        status: 400,
        headers: noStoreHeaders,
      },
    );
  }

  if ("spam" in validation) {
    return successResponse();
  }

  if (hasCooldownCookie) {
    return rateLimitResponse();
  }

  try {
    await createPublicContactMessage(validation.data);

    const response = successResponse();
    response.cookies.set(COOLDOWN_COOKIE_NAME, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOLDOWN_SECONDS,
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof PublicContactRateLimitError) {
      return rateLimitResponse();
    }

    return NextResponse.json(
      {
        success: false,
        message: "Your message could not be sent. Please try again later.",
      },
      {
        status: 500,
        headers: noStoreHeaders,
      },
    );
  }
}
