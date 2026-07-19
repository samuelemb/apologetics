import { PublicContainer } from "@/components/public/public-container";
import { PublicEventCard } from "@/components/public/public-event-card";
import { PublicLinkButton } from "@/components/public/public-link-button";
import type { RelatedPublicEvent } from "@/services/public-event-detail.service";

type EventRelatedEventsProps = {
  events: RelatedPublicEvent[];
};

export function EventRelatedEvents({ events }: EventRelatedEventsProps) {
  const visibleEvents = events.slice(0, 3);

  if (visibleEvents.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-public-border bg-public-primary-soft/35 py-10 sm:py-12 lg:py-14">
      <PublicContainer>
        <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="break-words font-editorial text-2xl font-bold leading-tight text-public-text sm:text-3xl">
            Related Events
          </h2>
          <PublicLinkButton href="/events" variant="text" size="sm">
            View All Events
          </PublicLinkButton>
        </header>

        <div className="mt-6 grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleEvents.map((event) => (
            <PublicEventCard
              key={event.id}
              event={event}
              variant="compact"
            />
          ))}
        </div>
      </PublicContainer>
    </section>
  );
}
