import { CalendarDays, ImageIcon } from "lucide-react";
import Link from "next/link";

import { PublicCard } from "@/components/public/public-card";
import { cn } from "@/lib/utils";
import type { getPublicHomeData } from "@/services/public-home.service";

type PublicHomeData = Awaited<ReturnType<typeof getPublicHomeData>>;

export type PublicNewsArticle = NonNullable<PublicHomeData["featuredNews"]>;

type PublicNewsCardProps = {
  article: PublicNewsArticle;
  variant?: "default" | "compact";
  className?: string;
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

export function PublicNewsCard({
  article,
  variant = "default",
  className,
}: PublicNewsCardProps) {
  const compact = variant === "compact";
  const publishedAt = isValidDate(article.publishedAt)
    ? article.publishedAt
    : null;

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
          {article.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.coverImageUrl}
              alt={article.coverImageAlt?.trim() || article.title}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-public-muted-text">
              <ImageIcon className="size-9" aria-hidden="true" />
              <span className="sr-only">No cover image available</span>
            </div>
          )}
          {article.category ? (
            <span className="absolute bottom-0 left-0 max-w-[90%] rounded-tr-[var(--public-radius)] bg-public-primary px-3 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-white">
              <span className="block truncate">{article.category.name}</span>
            </span>
          ) : null}
        </div>

        <div className={cn("flex min-w-0 flex-1 flex-col", compact ? "p-4" : "p-5")}>
          <h3
            className={cn(
              "break-words font-editorial font-bold leading-tight text-public-text transition-colors group-hover:text-public-primary",
              compact ? "text-lg" : "text-xl",
            )}
          >
            {article.title}
          </h3>
          {article.excerpt ? (
            <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-public-muted-text">
              {article.excerpt}
            </p>
          ) : null}
          {publishedAt ? (
            <p className="mt-auto flex items-center gap-2 pt-5 text-xs font-medium text-public-muted-text">
              <CalendarDays className="size-4 shrink-0 text-public-primary" aria-hidden="true" />
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
