import "server-only";

import { ContentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function getSafeAbsolutePdfUrl(value: string | null) {
  const normalizedValue = value?.trim();

  if (!normalizedValue || !/^https?:\/\//i.test(normalizedValue)) {
    return null;
  }

  try {
    const url = new URL(normalizedValue);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function getTrackedPublicMagazinePdf(
  slug: string,
): Promise<string | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const now = new Date();

  return prisma.$transaction(
    async (transaction) => {
      const issue = await transaction.magazineIssue.findFirst({
        where: {
          slug: normalizedSlug,
          status: ContentStatus.PUBLISHED,
          publicationDate: {
            not: null,
            lte: now,
          },
        },
        select: {
          id: true,
          pdfUrl: true,
        },
      });

      if (!issue) {
        return null;
      }

      const pdfUrl = getSafeAbsolutePdfUrl(issue.pdfUrl);

      if (!pdfUrl) {
        return null;
      }

      await transaction.magazineIssue.update({
        where: {
          id: issue.id,
        },
        data: {
          downloadCount: {
            increment: 1,
          },
        },
        select: {
          id: true,
        },
      });

      return pdfUrl;
    },
    {
      isolationLevel: "Serializable",
    },
  );
}
