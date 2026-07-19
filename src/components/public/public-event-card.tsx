import { Clock3, MapPin } from "lucide-react";
import Link from "next/link";

import { PublicCard } from "@/components/public/public-card";
import { PublicContentImage } from "@/components/public/public-content-image";
import { cn } from "@/lib/utils";

export type PublicEventCardItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  startAt: Date;
  endAt: Date | null;
  isOnline: boolean;
  location: string | null;
  category: {
    name: string;
    slug: string;
  } | null;
};

type PublicEventCardProps = {
  event: PublicEventCardItem;
  variant?: "default" | "compact";
  className?: string;
};

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});

const dayFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  timeZone: "UTC",
});

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isSameUtcDay(first: Date, second: Date) {
  return (
    first.getUTCFullYear() === second.getUTCFullYear() &&
    first.getUTCMonth() === second.getUTCMonth() &&
    first.getUTCDate() === second.getUTCDate()
  );
}

export function PublicEventCard({
  event,
  variant = "default",
  className,
}: PublicEventCardProps) {
  const compact = variant === "compact";
  const startAt = isValidDate(event.startAt) ? event.startAt : null;
  const endAt = isValidDate(event.endAt) ? event.endAt : null;
  const sameDay = Boolean(startAt && endAt && isSameUtcDay(startAt, endAt));
  const timeLabel = startAt
    ? `${timeFormatter.format(startAt)}${sameDay && endAt ? ` – ${timeFormatter.format(endAt)}` : ""}`
    : null;
  const differentEndDate =
    startAt && endAt && !sameDay
      ? `Ends ${dateFormatter.format(endAt)}`
      : null;
  const locationLabel = event.isOnline ? "Online" : event.location;

  return (
    <PublicCard interactive className={cn("h-full", className)}>
      <Link
        href={`/events/${event.slug}`}
        aria-label={`View event: ${event.title}`}
        className={cn(
          "group grid h-full min-w-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-public-primary",
          compact
            ? "grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)]"
            : "grid-cols-1",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden border-public-border bg-public-primary-soft",
            compact
              ? "aspect-[16/9] border-b sm:aspect-auto sm:min-h-full sm:border-r sm:border-b-0"
              : "aspect-[16/9] border-b",
          )}
        >
          <PublicContentImage
            src={event.coverImageUrl}
            alt={event.coverImageAlt?.trim() || event.title}
            imageClassName="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          {startAt ? (
            <time
              dateTime={startAt.toISOString()}
              aria-label={dateFormatter.format(startAt)}
              className={cn(
                "absolute left-3 flex min-w-14 flex-col items-center rounded-[var(--public-radius)] bg-public-surface px-2.5 py-2 text-center shadow-md",
                compact ? "top-3" : "bottom-3",
              )}
            >
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-public-primary">
                {monthFormatter.format(startAt)}
              </span>
              <span className="font-editorial text-2xl font-bold leading-none text-public-text">
                {dayFormatter.format(startAt)}
              </span>
            </time>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col p-4">
          {event.category ? (
            <p className="break-words text-xs font-bold uppercase tracking-[0.08em] text-public-primary">
              {event.category.name}
            </p>
          ) : null}
          <h3 className="mt-1.5 break-words font-editorial text-xl font-bold leading-tight text-public-text transition-colors group-hover:text-public-primary">
            {event.title}
          </h3>
          {event.summary ? (
            <p className="mt-2 line-clamp-2 break-words text-sm leading-5 text-public-muted-text">
              {event.summary}
            </p>
          ) : null}

          <div className="mt-auto space-y-2 pt-4 text-xs font-medium text-public-muted-text">
            {timeLabel ? (
              <p className="flex min-w-0 items-start gap-2">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-public-primary" aria-hidden="true" />
                <span className="break-words">
                  {timeLabel}
                  {differentEndDate ? ` · ${differentEndDate}` : ""}
                </span>
              </p>
            ) : null}
            {locationLabel ? (
              <p className="flex min-w-0 items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-public-primary" aria-hidden="true" />
                <span className="break-words">{locationLabel}</span>
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    </PublicCard>
  );
}
