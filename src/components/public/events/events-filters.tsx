import Link from "next/link";

import type { PublicEventCategory } from "@/services/public-events.service";

type EventPeriod = "upcoming" | "past";
type EventFormat = "all" | "online" | "physical";

type EventsFiltersProps = {
  activePeriod: EventPeriod;
  activeFormat: EventFormat;
  activeCategorySlug: string | null;
  categories: PublicEventCategory[];
};

type EventFilterValues = {
  period: EventPeriod;
  format: EventFormat;
  category: string | null;
};

function buildEventsHref(values: EventFilterValues) {
  const params = new URLSearchParams();

  if (values.period !== "upcoming") {
    params.set("period", values.period);
  }
  if (values.format !== "all") {
    params.set("format", values.format);
  }
  if (values.category) {
    params.set("category", values.category);
  }

  const query = params.toString();
  return query ? `/events?${query}` : "/events";
}

const baseLinkClasses =
  "inline-flex min-h-10 min-w-0 items-center rounded-[var(--public-radius)] border px-3 py-2 text-sm font-semibold leading-5 transition-[background-color,border-color,color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary";
const activeLinkClasses =
  "border-public-primary bg-public-primary text-white shadow-sm";
const inactiveLinkClasses =
  "border-public-border bg-public-surface text-public-text hover:border-public-primary/40 hover:bg-public-primary-soft hover:text-public-primary";

export function EventsFilters({
  activePeriod,
  activeFormat,
  activeCategorySlug,
  categories,
}: EventsFiltersProps) {
  const current = {
    period: activePeriod,
    format: activeFormat,
    category: activeCategorySlug,
  } satisfies EventFilterValues;

  return (
    <nav
      aria-label="Filter events"
      className="min-w-0 rounded-[var(--public-radius)] border border-public-border bg-public-surface p-3 sm:p-4"
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[auto_auto_minmax(0,1fr)] lg:gap-5">
        <div className="min-w-0" role="group" aria-labelledby="event-period-label">
          <p
            id="event-period-label"
            className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-public-muted-text"
          >
            Period
          </p>
          <div className="flex flex-wrap gap-2">
            {([
              ["upcoming", "Upcoming"],
              ["past", "Past Events"],
            ] as const).map(([value, label]) => {
              const active = activePeriod === value;
              return (
                <Link
                  key={value}
                  href={buildEventsHref({ ...current, period: value })}
                  aria-current={active ? "page" : undefined}
                  className={`${baseLinkClasses} ${active ? activeLinkClasses : inactiveLinkClasses}`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="min-w-0" role="group" aria-labelledby="event-format-label">
          <p
            id="event-format-label"
            className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-public-muted-text"
          >
            Format
          </p>
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "All Formats"],
              ["online", "Online"],
              ["physical", "Physical"],
            ] as const).map(([value, label]) => {
              const active = activeFormat === value;
              return (
                <Link
                  key={value}
                  href={buildEventsHref({ ...current, format: value })}
                  aria-current={active ? "page" : undefined}
                  className={`${baseLinkClasses} ${active ? activeLinkClasses : inactiveLinkClasses}`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="min-w-0" role="group" aria-labelledby="event-category-label">
          <p
            id="event-category-label"
            className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-public-muted-text"
          >
            Category
          </p>
          <div className="flex min-w-0 flex-wrap gap-2">
            {[{ name: "All Categories", slug: null }, ...categories].map(
              (category) => {
                const active = activeCategorySlug === category.slug;
                return (
                  <Link
                    key={category.slug ?? "all"}
                    href={buildEventsHref({
                      ...current,
                      category: category.slug,
                    })}
                    aria-current={active ? "page" : undefined}
                    className={`${baseLinkClasses} max-w-full break-words ${active ? activeLinkClasses : inactiveLinkClasses}`}
                  >
                    {category.name}
                  </Link>
                );
              },
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
