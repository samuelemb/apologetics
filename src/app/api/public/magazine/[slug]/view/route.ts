import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { recordPublicMagazineView } from "@/services/public-magazine-view.service";

const SESSION_COOKIE_NAME = "apologetics_public_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const USER_AGENT_MAX_LENGTH = 512;
const REFERRER_MAX_LENGTH = 2048;
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

function getBoundedHeader(value: string | null, maximumLength: number) {
  return value?.slice(0, maximumLength) ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: ViewRouteContext,
) {
  const { slug } = await params;
  const normalizedSlug = slug.trim();
  const existingSessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const shouldSetSessionCookie = !isValidSessionId(existingSessionId);
  const sessionId = shouldSetSessionCookie
    ? randomUUID()
    : existingSessionId!;

  try {
    const result = await recordPublicMagazineView({
      slug: normalizedSlug,
      sessionId,
      userAgent: getBoundedHeader(
        request.headers.get("user-agent"),
        USER_AGENT_MAX_LENGTH,
      ),
      referrer: getBoundedHeader(
        request.headers.get("referer"),
        REFERRER_MAX_LENGTH,
      ),
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
      { error: "Unable to record magazine view." },
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
