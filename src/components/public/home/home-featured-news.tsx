import { CalendarDays, ImageIcon, UserRound } from "lucide-react";
import Link from "next/link";

import { PublicCard } from "@/components/public/public-card";
import { PublicContainer } from "@/components/public/public-container";
import type { PublicNewsArticle } from "@/components/public/public-news-card";

type HomeFeaturedNewsProps = {
  article: PublicNewsArticle;
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

export function HomeFeaturedNews({ article }: HomeFeaturedNewsProps) {
  const publishedAt = isValidDate(article.publishedAt)
    ? article.publishedAt
    : null;

  return (
    <section aria-labelledby="featured-news-title" className="py-8 sm:py-10 lg:py-12">
      <PublicContainer>
        <PublicCard interactive>
          <Link
            href={`/news/${article.slug}`}
            aria-label={`Read featured article: ${article.title}`}
            className="group grid min-w-0 lg:grid-cols-[1.08fr_0.92fr] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-public-primary"
          >
            <div className="relative aspect-[16/10] min-h-56 overflow-hidden border-b border-public-border bg-public-primary-soft lg:aspect-auto lg:min-h-[22rem] lg:border-r lg:border-b-0">
              {article.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.coverImageUrl}
                  alt={article.coverImageAlt?.trim() || article.title}
                  decoding="async"
                  className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-public-muted-text">
                  <ImageIcon className="size-12" aria-hidden="true" />
                  <span className="sr-only">No cover image available</span>
                </div>
              )}
              <span className="absolute top-4 left-4 rounded-[var(--public-radius)] bg-public-primary px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-sm">
                Featured
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-center p-5 sm:p-7 lg:p-8">
              {article.category ? (
                <p className="break-words text-xs font-bold uppercase tracking-[0.1em] text-public-primary">
                  {article.category.name}
                </p>
              ) : null}
              <h1
                id="featured-news-title"
                className="mt-3 break-words font-editorial text-3xl font-bold leading-[1.08] text-public-text transition-colors group-hover:text-public-primary sm:text-4xl"
              >
                {article.title}
              </h1>
              {article.excerpt ? (
                <p className="mt-4 line-clamp-3 break-words text-sm leading-6 text-public-muted-text sm:text-base">
                  {article.excerpt}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-public-muted-text sm:text-sm">
                {publishedAt ? (
                  <span className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0 text-public-primary" aria-hidden="true" />
                    <time dateTime={publishedAt.toISOString()}>
                      {dateFormatter.format(publishedAt)}
                    </time>
                  </span>
                ) : null}
                {article.author ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <UserRound className="size-4 shrink-0 text-public-primary" aria-hidden="true" />
                    <span className="break-words">{article.author.name}</span>
                  </span>
                ) : null}
              </div>

              <span className="mt-7 inline-flex min-h-11 w-fit max-w-full items-center rounded-[var(--public-radius)] bg-public-primary px-5 text-sm font-bold text-white transition-colors group-hover:bg-public-primary-hover">
                Read article
              </span>
            </div>
          </Link>
        </PublicCard>
      </PublicContainer>
    </section>
  );
}
