import Link from "next/link";

import type { PublicEventDetail } from "@/services/public-event-detail.service";

export type EventScheduleStatus =
  | "Upcoming Event"
  | "Event in Progress"
  | "Past Event";

type EventDetailHeaderProps = {
  event: PublicEventDetail;
  status: EventScheduleStatus;
};

function buildCategoryHref(categorySlug: string) {
  const params = new URLSearchParams();
  params.set("category", categorySlug);
  return `/events?${params.toString()}`;
}

export function EventDetailHeader({
  event,
  status,
}: EventDetailHeaderProps) {
  return (
    <header>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {event.category ? (
          <Link
            href={buildCategoryHref(event.category.slug)}
            className="inline-flex min-h-9 max-w-full items-center rounded-[var(--public-radius)] bg-public-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-public-primary transition-colors hover:bg-public-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"
          >
            <span className="break-words">{event.category.name}</span>
          </Link>
        ) : null}
        <span className="inline-flex min-h-9 items-center rounded-[var(--public-radius)] border border-public-border bg-public-surface px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-public-text">
          {status}
        </span>
      </div>

      <h1 className="mt-4 break-words font-editorial text-3xl font-bold leading-[1.1] text-public-text sm:text-4xl">
        {event.title}
      </h1>

      {event.summary ? (
        <p className="mt-3 max-w-3xl break-words text-base leading-7 text-public-muted-text sm:mt-4 sm:text-lg sm:leading-8">
          {event.summary}
        </p>
      ) : null}
    </header>
  );
}
