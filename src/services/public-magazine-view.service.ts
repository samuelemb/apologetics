import "server-only";

import { ContentStatus, ContentType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const SESSION_ID_MAX_LENGTH = 128;
const USER_AGENT_MAX_LENGTH = 512;
const REFERRER_MAX_LENGTH = 2048;
const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RecordPublicMagazineViewInput = {
  slug: string;
  sessionId: string;
  userAgent?: string | null;
  referrer?: string | null;
};

export type RecordPublicMagazineViewResult = {
  counted: boolean;
};

function normalizeOptionalMetadata(
  value: string | null | undefined,
  maximumLength: number,
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue.slice(0, maximumLength) : null;
}

export async function recordPublicMagazineView(
  input: RecordPublicMagazineViewInput,
): Promise<RecordPublicMagazineViewResult> {
  const slug = typeof input.slug === "string" ? input.slug.trim() : "";
  const sessionId =
    typeof input.sessionId === "string" ? input.sessionId.trim() : "";

  if (
    !slug ||
    !sessionId ||
    sessionId.length > SESSION_ID_MAX_LENGTH ||
    !SESSION_ID_PATTERN.test(sessionId)
  ) {
    return { counted: false };
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - VIEW_WINDOW_MS);
  const userAgent = normalizeOptionalMetadata(
    input.userAgent,
    USER_AGENT_MAX_LENGTH,
  );
  const referrer = normalizeOptionalMetadata(
    input.referrer,
    REFERRER_MAX_LENGTH,
  );

  return prisma.$transaction(
    async (transaction) => {
      const issue = await transaction.magazineIssue.findFirst({
        where: {
          slug,
          status: ContentStatus.PUBLISHED,
          publicationDate: {
            not: null,
            lte: now,
          },
        },
        select: {
          id: true,
        },
      });

      if (!issue) {
        return { counted: false };
      }

      const recentView = await transaction.contentView.findFirst({
        where: {
          contentType: ContentType.MAGAZINE,
          contentId: issue.id,
          sessionId,
          viewedAt: {
            gte: windowStart,
          },
        },
        select: {
          id: true,
        },
      });

      if (recentView) {
        return { counted: false };
      }

      await transaction.contentView.create({
        data: {
          contentType: ContentType.MAGAZINE,
          contentId: issue.id,
          sessionId,
          ipHash: null,
          userAgent,
          referrer,
          viewedAt: now,
        },
        select: {
          id: true,
        },
      });

      await transaction.magazineIssue.update({
        where: {
          id: issue.id,
        },
        data: {
          viewCount: {
            increment: 1,
          },
        },
        select: {
          id: true,
        },
      });

      return { counted: true };
    },
    {
      isolationLevel: "Serializable",
    },
  );
}
