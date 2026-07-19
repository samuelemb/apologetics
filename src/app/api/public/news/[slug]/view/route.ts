import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { recordPublicNewsView } from "@/services/public-news-view.service";

const SESSION_COOKIE_NAME = "apologetics_public_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStoreHeaders = {
  "Cache-Control": "no-store",
};

type ViewRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function isValidSessionId(value: string | undefined) {
  return Boolean(value && value.length <= 128 && SESSION_ID_PATTERN.test(value));
}

function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

export async function POST(
  request: NextRequest,
  { params }: ViewRouteContext,
) {
  const { slug } = await params;
  const existingSessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const shouldSetSessionCookie = !isValidSessionId(existingSessionId);
  const sessionId = shouldSetSessionCookie
    ? randomUUID()
    : existingSessionId!;

  try {
    const result = await recordPublicNewsView({
      slug,
      sessionId,
      userAgent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
    });
    const response = NextResponse.json(
      { counted: result.counted },
      {
        status: 200,
        headers: noStoreHeaders,
      },
    );

    if (shouldSetSessionCookie) {
      setSessionCookie(response, sessionId);
    }

    return response;
  } catch {
    const response = NextResponse.json(
      { error: "Unable to record article view." },
      {
        status: 500,
        headers: noStoreHeaders,
      },
    );

    if (shouldSetSessionCookie) {
      setSessionCookie(response, sessionId);
    }

    return response;
  }
}
