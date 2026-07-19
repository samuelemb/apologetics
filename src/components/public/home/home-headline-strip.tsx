import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { PublicContainer } from "@/components/public/public-container";
import type { PublicNewsArticle } from "@/components/public/public-news-card";

type HomeHeadlineStripProps = {
  article: PublicNewsArticle;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function HomeHeadlineStrip({ article }: HomeHeadlineStripProps) {
  const publishedAt = isValidDate(article.publishedAt)
    ? article.publishedAt
    : null;

  return (
    <section
      aria-label="Latest headline"
      className="border-b border-public-border bg-public-surface"
    >
      <PublicContainer className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 py-2 lg:flex-nowrap">
        <span className="w-fit shrink-0 rounded bg-public-primary px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-white">
          BREAKING NEWS
        </span>

        <Link
          href={`/news/${article.slug}`}
          aria-label={`Read headline: ${article.title}`}
          className="group flex min-w-0 flex-[1_1_18rem] items-start gap-3 text-sm text-public-text sm:items-center"
        >
          <span
            aria-hidden="true"
            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-public-primary sm:mt-0"
          />
          <span className="min-w-0 break-words leading-5 transition-colors group-hover:text-public-primary">
            {article.title}
          </span>
        </Link>

        {publishedAt ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-2 text-xs text-public-muted-text">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            <time dateTime={publishedAt.toISOString()}>
              {dateFormatter.format(publishedAt)}
            </time>
          </span>
        ) : null}
      </PublicContainer>
    </section>
  );
}
