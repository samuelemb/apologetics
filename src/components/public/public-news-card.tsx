import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { PublicCard } from "@/components/public/public-card";
import { PublicContentImage } from "@/components/public/public-content-image";
import { cn } from "@/lib/utils";
import type { PublicNewsArticle as ServicePublicNewsArticle } from "@/services/public-news.service";

export type PublicNewsArticle = ServicePublicNewsArticle;
export type PublicNewsCardArticle = Omit<
  PublicNewsArticle,
  "publishedAt"
> & {
  publishedAt: Date | string | null;
};

type PublicNewsCardProps = {
  article: PublicNewsCardArticle;
  variant?: "default" | "compact";
  className?: string;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function normalizePublishedAt(value: Date | string | null) {
  const date = value instanceof Date ? value : new Date(value ?? "");

  return Number.isNaN(date.getTime()) ? null : date;
}

export function PublicNewsCard({
  article,
  variant = "default",
  className,
}: PublicNewsCardProps) {
  const compact = variant === "compact";
  const publishedAt = normalizePublishedAt(article.publishedAt);

  return (
    <PublicCard interactive className={cn("h-full", className)}>
      <Link
        href={`/news/${article.slug}`}
        aria-label={`Read article: ${article.title}`}
        className="group flex h-full min-w-0 flex-col focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-public-primary"
      >
        <div
          className={cn(
            "relative overflow-hidden border-b border-public-border bg-public-primary-soft",
            compact ? "aspect-[16/9]" : "aspect-[16/10]",
          )}
        >
          <PublicContentImage
            src={article.coverImageUrl}
            alt={article.coverImageAlt?.trim() || article.title}
            imageClassName="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          {article.category ? (
            <span
              className={cn(
                "absolute bottom-0 left-0 max-w-[90%] rounded-tr-[var(--public-radius)] bg-public-primary font-bold uppercase tracking-[0.06em] text-white",
                compact
                  ? "px-2 py-1 text-[0.625rem]"
                  : "px-3 py-1.5 text-xs",
              )}
            >
              <span className="block truncate">{article.category.name}</span>
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            compact ? "p-3" : "p-5",
          )}
        >
          <h3
            className={cn(
              "break-words font-editorial font-bold leading-tight text-public-text transition-colors group-hover:text-public-primary",
              compact ? "text-base" : "text-xl",
            )}
          >
            {article.title}
          </h3>
          {article.excerpt ? (
            <p
              className={cn(
                "mt-2 break-words text-sm text-public-muted-text",
                compact ? "line-clamp-2 leading-5" : "line-clamp-3 leading-6",
              )}
            >
              {article.excerpt}
            </p>
          ) : null}
          {publishedAt ? (
            <p
              className={cn(
                "mt-auto flex items-center gap-2 text-xs font-medium text-public-muted-text",
                compact ? "pt-3" : "pt-5",
              )}
            >
              <CalendarDays
                className={cn(
                  "shrink-0 text-public-primary",
                  compact ? "size-3.5" : "size-4",
                )}
                aria-hidden="true"
              />
              <time dateTime={publishedAt.toISOString()}>
                {dateFormatter.format(publishedAt)}
              </time>
            </p>
          ) : null}
        </div>
      </Link>
    </PublicCard>
  );
}
