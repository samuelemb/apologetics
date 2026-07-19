import "server-only";

import { ContentStatus, ContentType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const SESSION_ID_MAX_LENGTH = 128;
const USER_AGENT_MAX_LENGTH = 512;
const REFERRER_MAX_LENGTH = 2048;
const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export type RecordPublicNewsViewInput = {
  slug: string;
  sessionId: string;
  userAgent?: string | null;
  referrer?: string | null;
};

export type RecordPublicNewsViewResult = {
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

export async function recordPublicNewsView(
  input: RecordPublicNewsViewInput,
): Promise<RecordPublicNewsViewResult> {
  const slug = typeof input.slug === "string" ? input.slug.trim() : "";
  const sessionId =
    typeof input.sessionId === "string" ? input.sessionId.trim() : "";

  if (
    !slug ||
    !sessionId ||
    sessionId.length > SESSION_ID_MAX_LENGTH
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
      const article = await transaction.newsArticle.findFirst({
        where: {
          slug,
          status: ContentStatus.PUBLISHED,
          publishedAt: {
            not: null,
            lte: now,
          },
        },
        select: {
          id: true,
        },
      });

      if (!article) {
        return { counted: false };
      }

      const recentView = await transaction.contentView.findFirst({
        where: {
          contentType: ContentType.NEWS,
          contentId: article.id,
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
          contentType: ContentType.NEWS,
          contentId: article.id,
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

      await transaction.newsArticle.update({
        where: {
          id: article.id,
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
