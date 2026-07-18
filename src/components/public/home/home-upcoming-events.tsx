import { PublicCard } from "@/components/public/public-card";
import { PublicContainer } from "@/components/public/public-container";
import {
  PublicEventCard,
  type PublicEvent,
} from "@/components/public/public-event-card";
import { PublicLinkButton } from "@/components/public/public-link-button";
import { PublicSectionHeading } from "@/components/public/public-section-heading";

type HomeUpcomingEventsProps = {
  events: PublicEvent[];
};

export function HomeUpcomingEvents({ events }: HomeUpcomingEventsProps) {
  return (
    <section aria-label="Upcoming Events" className="pb-12 sm:pb-16">
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
          <div className="mt-6 grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <PublicEventCard key={event.id} event={event} variant="compact" />
            ))}
          </div>
        ) : (
          <PublicCard className="mt-6 px-5 py-8 text-center sm:px-8">
            <p className="text-sm leading-6 text-public-muted-text sm:text-base">
              There are no upcoming published events.
            </p>
          </PublicCard>
        )}
      </PublicContainer>
    </section>
  );
}
