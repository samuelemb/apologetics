import { CalendarDays, UserRound } from "lucide-react";
import Link from "next/link";

import { PublicCard } from "@/components/public/public-card";
import { PublicContentImage } from "@/components/public/public-content-image";
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
    <section
      aria-labelledby="featured-news-title"
      className="py-5 sm:py-6 lg:py-7"
    >
      <PublicContainer>
        <PublicCard interactive>
          <Link
            href={`/news/${article.slug}`}
            aria-label={`Read featured article: ${article.title}`}
            className="group grid min-w-0 lg:grid-cols-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-public-primary"
          >
            <div className="relative aspect-[16/9] overflow-hidden border-b border-public-border bg-public-primary-soft lg:h-[15.5rem] lg:aspect-auto lg:border-r lg:border-b-0">
              <PublicContentImage
                src={article.coverImageUrl}
                alt={article.coverImageAlt?.trim() || article.title}
                loading="eager"
                imageClassName="object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                fallbackClassName="[&_svg]:size-11"
              />
              <span className="absolute top-3 left-3 rounded-[var(--public-radius)] bg-public-primary px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-white shadow-sm">
                Featured
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-center p-5 sm:px-6 sm:py-5">
              {article.category ? (
                <p className="break-words text-xs font-bold uppercase tracking-[0.1em] text-public-primary">
                  {article.category.name}
                </p>
              ) : null}
              <h1
                id="featured-news-title"
                className="mt-2.5 break-words font-editorial text-2xl font-bold leading-[1.1] text-public-text transition-colors group-hover:text-public-primary sm:text-3xl lg:text-[2rem]"
              >
                {article.title}
              </h1>
              {article.excerpt ? (
                <p className="mt-3 line-clamp-2 break-words text-sm leading-5 text-public-muted-text sm:leading-6">
                  {article.excerpt}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-public-muted-text">
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

              <span className="mt-4 inline-flex min-h-10 w-fit max-w-full items-center rounded-[var(--public-radius)] bg-public-primary px-4 text-sm font-bold text-white transition-colors group-hover:bg-public-primary-hover">
                Read article
              </span>
            </div>
          </Link>
        </PublicCard>
      </PublicContainer>
    </section>
  );
}
