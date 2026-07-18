import { BookOpenText, CalendarDays, Files, ImageIcon } from "lucide-react";
import Link from "next/link";

import { PublicCard } from "@/components/public/public-card";
import { cn } from "@/lib/utils";
import type { getPublicHomeData } from "@/services/public-home.service";

type PublicHomeData = Awaited<ReturnType<typeof getPublicHomeData>>;

export type PublicMagazine = NonNullable<PublicHomeData["latestMagazine"]>;

type PublicMagazineCardProps = {
  magazine: PublicMagazine;
  variant?: "default" | "featured";
  className?: string;
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

export function PublicMagazineCard({
  magazine,
  variant = "default",
  className,
}: PublicMagazineCardProps) {
  const featured = variant === "featured";
  const publicationDate = isValidDate(magazine.publicationDate)
    ? magazine.publicationDate
    : null;

  return (
    <PublicCard interactive className={cn("h-full", className)}>
      <Link
        href={`/magazine/${magazine.slug}`}
        aria-label={`View magazine issue: ${magazine.title}`}
        className={cn(
          "group grid h-full min-w-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-public-primary",
          featured
            ? "grid-cols-1 md:grid-cols-[minmax(13rem,0.42fr)_minmax(0,1fr)]"
            : "grid-cols-1",
        )}
      >
        <div
          className={cn(
            "relative mx-auto w-full overflow-hidden border-public-border bg-public-primary-soft",
            featured
              ? "aspect-[3/4] max-w-sm border-b md:max-w-none md:border-r md:border-b-0"
              : "aspect-[3/4] border-b",
          )}
        >
          {magazine.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={magazine.coverImageUrl}
              alt={magazine.coverImageAlt?.trim() || magazine.title}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-public-muted-text">
              <ImageIcon className="size-10" aria-hidden="true" />
              <span className="text-xs">No cover image available</span>
            </div>
          )}
        </div>

        <div className={cn("flex min-w-0 flex-col justify-center", featured ? "p-6 sm:p-8" : "p-5")}>
          {magazine.category ? (
            <p className="break-words text-xs font-bold uppercase tracking-[0.1em] text-public-primary">
              {magazine.category.name}
            </p>
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-[0.06em] text-public-muted-text">
            <span>{magazine.issueNumber}</span>
            {magazine.volume ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="break-words">{magazine.volume}</span>
              </>
            ) : null}
          </p>
          <h3
            className={cn(
              "mt-3 break-words font-editorial font-bold leading-tight text-public-text transition-colors group-hover:text-public-primary",
              featured ? "text-3xl sm:text-4xl" : "text-xl",
            )}
          >
            {magazine.title}
          </h3>
          {magazine.description ? (
            <p className="mt-4 line-clamp-4 break-words text-sm leading-6 text-public-muted-text sm:text-base">
              {magazine.description}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-public-muted-text sm:text-sm">
            {publicationDate ? (
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-public-primary" aria-hidden="true" />
                <time dateTime={publicationDate.toISOString()}>
                  {dateFormatter.format(publicationDate)}
                </time>
              </span>
            ) : null}
            {magazine.pageCount ? (
              <span className="flex items-center gap-2">
                <Files className="size-4 shrink-0 text-public-primary" aria-hidden="true" />
                {magazine.pageCount} pages
              </span>
            ) : null}
          </div>

          <span className="mt-7 inline-flex min-h-11 w-fit max-w-full items-center gap-2 rounded-[var(--public-radius)] bg-public-primary px-5 text-sm font-bold text-white transition-colors group-hover:bg-public-primary-hover">
            <BookOpenText className="size-4 shrink-0" aria-hidden="true" />
            View issue
          </span>
        </div>
      </Link>
    </PublicCard>
  );
}
