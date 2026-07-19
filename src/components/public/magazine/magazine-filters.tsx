import { Check } from "lucide-react";
import Link from "next/link";

import type {
  PublicMagazineCategory,
  PublicMagazineSort,
} from "@/services/public-magazines.service";

type MagazineFiltersProps = {
  activeCategorySlug: string | null;
  activeYear: number | null;
  activeSort: PublicMagazineSort;
  categories: PublicMagazineCategory[];
  years: number[];
};

type MagazineFilterValues = {
  categorySlug: string | null;
  year: number | null;
  sort: PublicMagazineSort;
};

function buildMagazineFilterHref(values: MagazineFilterValues) {
  const params = new URLSearchParams();

  if (values.categorySlug) {
    params.set("category", values.categorySlug);
  }
  if (values.year !== null) {
    params.set("year", String(values.year));
  }
  if (values.sort !== "newest") {
    params.set("sort", values.sort);
  }

  const query = params.toString();
  return query ? `/magazine?${query}` : "/magazine";
}

const baseLinkClasses =
  "inline-flex min-h-10 min-w-0 max-w-full items-center gap-1.5 rounded-[var(--public-radius)] border px-3 py-2 text-sm font-semibold leading-5 transition-[background-color,border-color,color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary";
const activeLinkClasses =
  "border-public-primary bg-public-primary text-white shadow-sm";
const inactiveLinkClasses =
  "border-public-border bg-public-surface text-public-text hover:border-public-primary/40 hover:bg-public-primary-soft hover:text-public-primary";

function ActiveMark({ active }: { active: boolean }) {
  return active ? (
    <Check className="size-3.5 shrink-0" aria-hidden="true" />
  ) : null;
}

export function MagazineFilters({
  activeCategorySlug,
  activeYear,
  activeSort,
  categories,
  years,
}: MagazineFiltersProps) {
  const current = {
    categorySlug: activeCategorySlug,
    year: activeYear,
    sort: activeSort,
  } satisfies MagazineFilterValues;

  return (
    <nav
      aria-label="Filter magazine issues"
      className="min-w-0 rounded-[var(--public-radius)] border border-public-border bg-public-surface p-3 shadow-[var(--public-shadow)] sm:p-4"
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-5">
        <div
          className="min-w-0"
          role="group"
          aria-labelledby="magazine-category-label"
        >
          <p
            id="magazine-category-label"
            className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-public-muted-text"
          >
            Category
          </p>
          <div className="flex min-w-0 flex-wrap gap-2">
            <Link
              href={buildMagazineFilterHref({
                ...current,
                categorySlug: null,
              })}
              aria-current={
                activeCategorySlug === null ? "page" : undefined
              }
              className={`${baseLinkClasses} ${activeCategorySlug === null ? activeLinkClasses : inactiveLinkClasses}`}
            >
              <ActiveMark active={activeCategorySlug === null} />
              All Categories
            </Link>
            {categories.map((category) => {
              const active = activeCategorySlug === category.slug;

              return (
                <Link
                  key={category.id}
                  href={buildMagazineFilterHref({
                    ...current,
                    categorySlug: category.slug,
                  })}
                  aria-current={active ? "page" : undefined}
                  className={`${baseLinkClasses} break-words ${active ? activeLinkClasses : inactiveLinkClasses}`}
                >
                  <ActiveMark active={active} />
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div
          className="min-w-0"
          role="group"
          aria-labelledby="magazine-year-label"
        >
          <p
            id="magazine-year-label"
            className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-public-muted-text"
          >
            Year
          </p>
          <div className="flex min-w-0 flex-wrap gap-2">
            <Link
              href={buildMagazineFilterHref({ ...current, year: null })}
              aria-current={activeYear === null ? "page" : undefined}
              className={`${baseLinkClasses} whitespace-nowrap ${activeYear === null ? activeLinkClasses : inactiveLinkClasses}`}
            >
              <ActiveMark active={activeYear === null} />
              All Years
            </Link>
            {years.map((year) => {
              const active = activeYear === year;

              return (
                <Link
                  key={year}
                  href={buildMagazineFilterHref({ ...current, year })}
                  aria-current={active ? "page" : undefined}
                  className={`${baseLinkClasses} whitespace-nowrap ${active ? activeLinkClasses : inactiveLinkClasses}`}
                >
                  <ActiveMark active={active} />
                  {year}
                </Link>
              );
            })}
          </div>
        </div>

        <div
          className="min-w-0"
          role="group"
          aria-labelledby="magazine-sort-label"
        >
          <p
            id="magazine-sort-label"
            className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-public-muted-text"
          >
            Sort
          </p>
          <div className="flex min-w-0 flex-wrap gap-2">
            {([
              ["newest", "Newest First"],
              ["oldest", "Oldest First"],
            ] as const).map(([sort, label]) => {
              const active = activeSort === sort;

              return (
                <Link
                  key={sort}
                  href={buildMagazineFilterHref({ ...current, sort })}
                  aria-current={active ? "page" : undefined}
                  className={`${baseLinkClasses} whitespace-nowrap ${active ? activeLinkClasses : inactiveLinkClasses}`}
                >
                  <ActiveMark active={active} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
