import type { Metadata } from "next";
import { connection } from "next/server";

import { EventsFilters } from "@/components/public/events/events-filters";
import {
  buildEventsPageHref,
  EventsPagination,
} from "@/components/public/events/events-pagination";
import { PublicEventCard } from "@/components/public/public-event-card";
import { PublicContainer } from "@/components/public/public-container";
import { PublicLinkButton } from "@/components/public/public-link-button";
import {
  listPublicEventCategories,
  listPublicEvents,
  type PublicEventsInput,
} from "@/services/public-events.service";

export const metadata: Metadata = {
  title: "Events | APOLOGETICS መፅሔት",
  description:
    "Discover upcoming Islamic events, seminars, conferences, and community programs from APOLOGETICS መፅሔት.",
};

type EventsPageProps = {
  searchParams: Promise<{
    period?: string | string[];
    format?: string | string[];
    category?: string | string[];
    page?: string | string[];
  }>;
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  await connection();

  const { period, format, category, page } = await searchParams;
  const periodValue = Array.isArray(period) ? period[0] : period;
  const formatValue = Array.isArray(format) ? format[0] : format;
  const categoryValue = Array.isArray(category) ? category[0] : category;
  const pageValue = Array.isArray(page) ? page[0] : page;

  const activePeriod = periodValue === "past" ? "past" : "upcoming";
  const activeFormat =
    formatValue === "online" || formatValue === "physical"
      ? formatValue
      : "all";
  const activeCategorySlug = categoryValue?.trim() || null;

  const [result, categories] = await Promise.all([
    listPublicEvents({
      period: periodValue as PublicEventsInput["period"],
      format: formatValue as PublicEventsInput["format"],
      categorySlug: categoryValue,
      page: pageValue === undefined ? undefined : Number(pageValue),
      limit: 9,
    }),
    listPublicEventCategories(),
  ]);

  const hasExtraFilter =
    activeFormat !== "all" || activeCategorySlug !== null;
  const hasAnyFilter = activePeriod !== "upcoming" || hasExtraFilter;
  const isOutOfRange =
    result.total > 0 &&
    result.totalPages > 0 &&
    result.page > result.totalPages;
  const firstPageHref = buildEventsPageHref({
    page: 1,
    period: activePeriod,
    format: activeFormat,
    categorySlug: activeCategorySlug,
  });
  const emptyTitle = hasExtraFilter
    ? "No matching events"
    : activePeriod === "past"
      ? "No past events"
      : "No upcoming events";
  const emptyText = hasExtraFilter
    ? "No published events match the selected filters."
    : activePeriod === "past"
      ? "There are no past published events available right now."
      : "There are no upcoming published events available right now. Please check back later.";

  return (
    <main className="min-w-0 flex-1 bg-public-background">
      <section
        aria-labelledby="events-page-title"
        className="border-b border-public-border bg-public-primary-soft/40"
      >
        <PublicContainer className="py-8 sm:py-10">
          <h1
            id="events-page-title"
            className="break-words font-editorial text-3xl font-bold leading-tight text-public-text sm:text-4xl"
          >
            Events
          </h1>
          <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-public-muted-text sm:text-base">
            Explore upcoming seminars, conferences, discussions, and community
            programs.
          </p>
        </PublicContainer>
      </section>

      <section aria-label="Event results" className="py-8 sm:py-10 lg:py-12">
        <PublicContainer>
          <EventsFilters
            activePeriod={activePeriod}
            activeFormat={activeFormat}
            activeCategorySlug={activeCategorySlug}
            categories={categories}
          />

          {result.events.length > 0 ? (
            <>
              <div className="mt-7 grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {result.events.map((event) => (
                  <PublicEventCard
                    key={event.id}
                    event={event}
                    variant="default"
                  />
                ))}
              </div>
              <EventsPagination
                currentPage={result.page}
                totalPages={result.totalPages}
                period={activePeriod}
                format={activeFormat}
                categorySlug={activeCategorySlug}
              />
            </>
          ) : (
            <div className="mt-7 rounded-[var(--public-radius)] border border-public-border bg-public-surface px-5 py-7 text-center shadow-[var(--public-shadow)] sm:px-8 sm:py-8">
              <h2 className="break-words font-editorial text-xl font-bold text-public-text sm:text-2xl">
                {isOutOfRange ? "Page not available" : emptyTitle}
              </h2>
              <p className="mx-auto mt-2 max-w-xl break-words text-sm leading-6 text-public-muted-text sm:text-base">
                {isOutOfRange
                  ? "This events page does not exist or is no longer available."
                  : emptyText}
              </p>
              {isOutOfRange ? (
                <PublicLinkButton
                  href={firstPageHref}
                  variant="secondary"
                  size="sm"
                  className="mt-5"
                >
                  Return to first page
                </PublicLinkButton>
              ) : hasAnyFilter ? (
                <PublicLinkButton
                  href="/events"
                  variant="secondary"
                  size="sm"
                  className="mt-5"
                >
                  Clear filters
                </PublicLinkButton>
              ) : null}
            </div>
          )}
        </PublicContainer>
      </section>
    </main>
  );
}
