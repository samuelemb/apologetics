import { CalendarDays, UserRound } from "lucide-react";
import Link from "next/link";

import type { PublicNewsDetailArticle } from "@/services/public-news-detail.service";

type NewsArticleHeaderProps = {
  article: PublicNewsDetailArticle;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function NewsArticleHeader({ article }: NewsArticleHeaderProps) {
  const publishedAt = isValidDate(article.publishedAt)
    ? article.publishedAt
    : null;

  return (
    <header>
      {article.category ? (
        <Link
          href={`/news?category=${encodeURIComponent(article.category.slug)}`}
          className="inline-flex min-h-9 max-w-full items-center rounded-[var(--public-radius)] bg-public-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-public-primary transition-colors hover:bg-public-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"
        >
          <span className="break-words">{article.category.name}</span>
        </Link>
      ) : null}

      <h1 className="mt-4 break-words font-editorial text-3xl font-bold leading-[1.08] text-public-text sm:text-4xl lg:text-5xl">
        {article.title}
      </h1>

      {article.excerpt ? (
        <p className="mt-4 max-w-3xl break-words text-base leading-7 text-public-muted-text sm:text-lg sm:leading-8">
          {article.excerpt}
        </p>
      ) : null}

      {article.author || publishedAt ? (
        <div className="mt-6 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3 border-b border-public-border pb-6 text-sm font-medium text-public-muted-text">
          {article.author ? (
            <span className="inline-flex min-w-0 items-center gap-2">
              <UserRound
                aria-hidden="true"
                className="size-4 shrink-0 text-public-primary"
              />
              <span className="break-words text-public-text">
                {article.author.name}
              </span>
            </span>
          ) : null}
          {publishedAt ? (
            <span className="inline-flex items-center gap-2">
              <CalendarDays
                aria-hidden="true"
                className="size-4 shrink-0 text-public-primary"
              />
              <time dateTime={publishedAt.toISOString()}>
                {dateFormatter.format(publishedAt)}
              </time>
            </span>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
