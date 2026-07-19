import type { Metadata } from "next";
import { connection } from "next/server";

import { MagazineFilters } from "@/components/public/magazine/magazine-filters";
import {
  buildMagazinePageHref,
  MagazinePagination,
} from "@/components/public/magazine/magazine-pagination";
import { PublicContainer } from "@/components/public/public-container";
import { PublicLinkButton } from "@/components/public/public-link-button";
import { PublicMagazineCard } from "@/components/public/public-magazine-card";
import {
  listPublicMagazineCategories,
  listPublicMagazines,
  listPublicMagazineYears,
  type PublicMagazinesInput,
} from "@/services/public-magazines.service";

export const metadata: Metadata = {
  title: "Magazine | APOLOGETICS መፅሔት",
  description:
    "Explore published issues of APOLOGETICS መፅሔት featuring Islamic thought, education, apologetics, community insight, and contemporary discussions.",
};

type MagazinePageProps = {
  searchParams: Promise<{
    category?: string | string[];
    year?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MagazinePage({
  searchParams,
}: MagazinePageProps) {
  await connection();

  const search = await searchParams;
  const category = firstValue(search.category);
  const year = firstValue(search.year);
  const sort = firstValue(search.sort);
  const page = firstValue(search.page);

  const [result, categories, years] = await Promise.all([
    listPublicMagazines({
      categorySlug: category,
      year,
      sort: sort as PublicMagazinesInput["sort"],
      page,
      limit: 12,
    }),
    listPublicMagazineCategories(),
    listPublicMagazineYears(),
  ]);

  const hasAnyFilter =
    result.categorySlug !== null ||
    result.year !== null ||
    result.sort !== "newest";
  const isOutOfRange =
    result.total > 0 &&
    result.totalPages > 0 &&
    result.page > result.totalPages;
  const firstPageHref = buildMagazinePageHref({
    page: 1,
    categorySlug: result.categorySlug,
    year: result.year,
    sort: result.sort,
  });

  return (
    <main className="min-w-0 flex-1 bg-public-background">
      <section
        aria-labelledby="magazine-page-title"
        className="border-b border-public-border bg-public-primary-soft/40"
      >
        <PublicContainer className="py-8 sm:py-10">
          <h1
            id="magazine-page-title"
            className="break-words font-editorial text-3xl font-bold leading-tight text-public-text sm:text-4xl"
          >
            Magazine
          </h1>
          <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-public-muted-text sm:text-base">
            Read the latest and previous issues of APOLOGETICS መፅሔት.
          </p>
        </PublicContainer>
      </section>

      <section
        aria-label="Magazine results"
        className="py-8 sm:py-10 lg:py-12"
      >
        <PublicContainer>
          <MagazineFilters
            activeCategorySlug={result.categorySlug}
            activeYear={result.year}
            activeSort={result.sort}
            categories={categories}
            years={years}
          />

          {result.magazines.length > 0 ? (
            <>
              <h2 className="sr-only">Magazine issues</h2>
              <div className="mt-7 grid min-w-0 grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {result.magazines.map((magazine) => (
                  <PublicMagazineCard
                    key={magazine.id}
                    magazine={magazine}
                    variant="default"
                  />
                ))}
              </div>
              <MagazinePagination
                currentPage={result.page}
                totalPages={result.totalPages}
                categorySlug={result.categorySlug}
                year={result.year}
                sort={result.sort}
              />
            </>
          ) : (
            <div className="mt-7 rounded-[var(--public-radius)] border border-public-border bg-public-surface px-5 py-7 text-center shadow-[var(--public-shadow)] sm:px-8 sm:py-8">
              <h2 className="break-words font-editorial text-xl font-bold text-public-text sm:text-2xl">
                {isOutOfRange
                  ? "Page not available"
                  : hasAnyFilter
                    ? "No matching issues"
                    : "No magazine issues"}
              </h2>
              <p className="mx-auto mt-2 max-w-xl break-words text-sm leading-6 text-public-muted-text sm:text-base">
                {isOutOfRange
                  ? "This magazine page does not exist or is no longer available."
                  : hasAnyFilter
                    ? "No published magazine issues match the selected filters."
                    : "There are no published magazine issues available right now. Please check back later."}
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
                  href="/magazine"
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
