import { CalendarDays, Clock3, MapPin } from "lucide-react";
import Link from "next/link";

import { PublicCard } from "@/components/public/public-card";
import { PublicContainer } from "@/components/public/public-container";
import type { PublicEvent } from "@/components/public/public-event-card";
import { PublicLinkButton } from "@/components/public/public-link-button";
import { PublicSectionHeading } from "@/components/public/public-section-heading";

type HomeUpcomingEventsProps = {
  events: PublicEvent[];
};

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});

const dayFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
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

export function HomeUpcomingEvents({ events }: HomeUpcomingEventsProps) {
  return (
    <section aria-label="Upcoming Events" className="pb-5 sm:pb-6">
      <PublicContainer>
        <PublicSectionHeading
          title="Upcoming Events"
          action={
            <PublicLinkButton href="/events" variant="text" size="sm">
              View all events →
            </PublicLinkButton>
          }
        />

        {events.length ? (
          <div className="mt-4 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
            {events.map((event) => {
              const startAt = isValidDate(event.startAt)
                ? event.startAt
                : null;
              const locationLabel = event.isOnline
                ? "Online"
                : event.location;

              return (
                <PublicCard key={event.id} interactive className="h-full">
                  <Link
                    href={`/events/${event.slug}`}
                    aria-label={`View event: ${event.title}`}
                    className="group grid h-full min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-public-primary"
                  >
                    <div className="flex min-h-24 items-center justify-center border-r border-public-border bg-public-primary-soft p-2 text-center">
                      {startAt ? (
                        <time
                          dateTime={startAt.toISOString()}
                          className="flex flex-col items-center"
                        >
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-public-primary">
                            {monthFormatter.format(startAt)}
                          </span>
                          <span className="mt-0.5 font-editorial text-3xl font-bold leading-none text-public-text">
                            {dayFormatter.format(startAt)}
                          </span>
                        </time>
                      ) : (
                        <span
                          role="img"
                          aria-label="Event date unavailable"
                          className="text-public-muted-text"
                        >
                          <CalendarDays aria-hidden="true" className="size-6" />
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-col justify-center p-3.5">
                      <h3 className="break-words text-sm font-bold leading-5 text-public-text transition-colors group-hover:text-public-primary">
                        {event.title}
                      </h3>
                      <div className="mt-2 space-y-1.5 text-xs font-medium text-public-muted-text">
                        {locationLabel ? (
                          <p className="flex min-w-0 items-start gap-2">
                            <MapPin
                              aria-hidden="true"
                              className="mt-0.5 size-3.5 shrink-0 text-public-primary"
                            />
                            <span className="break-words">{locationLabel}</span>
                          </p>
                        ) : null}
                        {startAt ? (
                          <p className="flex min-w-0 items-start gap-2">
                            <Clock3
                              aria-hidden="true"
                              className="mt-0.5 size-3.5 shrink-0 text-public-primary"
                            />
                            <span>{timeFormatter.format(startAt)}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </PublicCard>
              );
            })}
          </div>
        ) : (
          <PublicCard className="mt-4 px-5 py-6 text-center sm:px-8">
            <p className="text-sm leading-6 text-public-muted-text">
              There are no upcoming published events.
            </p>
          </PublicCard>
        )}
      </PublicContainer>
    </section>
  );
}
