import Link from "next/link";

import type { PublicNewsCategory } from "@/services/public-news.service";

type NewsCategoryFilterProps = {
  categories: PublicNewsCategory[];
  selectedCategorySlug?: string;
};

const baseLinkClasses =
  "inline-flex min-h-11 max-w-full items-center justify-center rounded-[var(--public-radius)] border px-4 py-2 text-center text-sm leading-5 transition-[background-color,border-color,color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary";

function categoryLinkClasses(isActive: boolean) {
  return `${baseLinkClasses} ${
    isActive
      ? "border-public-primary bg-public-primary font-bold text-white"
      : "border-public-border bg-public-surface font-medium text-public-text hover:border-public-primary/35 hover:bg-public-primary-soft hover:text-public-primary"
  }`;
}

export function NewsCategoryFilter({
  categories,
  selectedCategorySlug,
}: NewsCategoryFilterProps) {
  const allIsActive = !selectedCategorySlug;

  return (
    <nav aria-label="Filter News by category">
      <div className="flex min-w-0 flex-wrap items-stretch gap-2 sm:justify-center">
        <Link
          href="/news"
          aria-current={allIsActive ? "page" : undefined}
          className={categoryLinkClasses(allIsActive)}
        >
          <span className="break-words">
            All
            {allIsActive ? <span className="sr-only"> (current)</span> : null}
          </span>
        </Link>

        {categories.map((category) => {
          const isActive = category.slug === selectedCategorySlug;

          return (
            <Link
              key={category.id}
              href={`/news?category=${encodeURIComponent(category.slug)}`}
              aria-current={isActive ? "page" : undefined}
              className={categoryLinkClasses(isActive)}
            >
              <span className="break-words">
                {category.name}
                {isActive ? (
                  <span className="sr-only"> (current)</span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
