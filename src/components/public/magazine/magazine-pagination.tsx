import Link from "next/link";

import type { PublicMagazineSort } from "@/services/public-magazines.service";

type MagazinePageHrefValues = {
  page: number;
  categorySlug: string | null;
  year: number | null;
  sort: PublicMagazineSort;
};

type MagazinePaginationProps = {
  currentPage: number;
  totalPages: number;
  categorySlug: string | null;
  year: number | null;
  sort: PublicMagazineSort;
};

export function buildMagazinePageHref({
  page,
  categorySlug,
  year,
  sort,
}: MagazinePageHrefValues) {
  const params = new URLSearchParams();

  if (categorySlug) {
    params.set("category", categorySlug);
  }
  if (year !== null) {
    params.set("year", String(year));
  }
  if (sort !== "newest") {
    params.set("sort", sort);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/magazine?${query}` : "/magazine";
}

const controlClasses =
  "inline-flex min-h-10 items-center justify-center rounded-[var(--public-radius)] border border-public-border bg-public-surface px-3.5 text-sm font-semibold leading-5 text-public-text transition-[background-color,border-color,color] hover:border-public-primary/40 hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary";
const disabledClasses =
  "inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-[var(--public-radius)] border border-public-border bg-public-background px-3.5 text-sm font-semibold leading-5 text-public-muted-text opacity-60";

export function MagazinePagination({
  currentPage,
  totalPages,
  categorySlug,
  year,
  sort,
}: MagazinePaginationProps) {
  if (
    totalPages <= 1 ||
    currentPage < 1 ||
    currentPage > totalPages
  ) {
    return null;
  }

  const hrefValues = { categorySlug, year, sort };

  return (
    <nav
      aria-label="Magazine pagination"
      className="mt-8 flex min-w-0 flex-wrap items-center justify-center gap-3 border-t border-public-border pt-6 sm:mt-10"
    >
      {currentPage > 1 ? (
        <Link
          href={buildMagazinePageHref({
            ...hrefValues,
            page: currentPage - 1,
          })}
          className={controlClasses}
        >
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClasses}>
          Previous
        </span>
      )}

      <span className="px-1 text-center text-sm font-medium text-public-muted-text">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={buildMagazinePageHref({
            ...hrefValues,
            page: currentPage + 1,
          })}
          className={controlClasses}
        >
          Next
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClasses}>
          Next
        </span>
      )}
    </nav>
  );
}
