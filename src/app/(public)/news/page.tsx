import type { Metadata } from "next";
import { connection } from "next/server";

import { NewsCategoryFilter } from "@/components/public/news/news-category-filter";
import { NewsFeed } from "@/components/public/news/news-feed";
import { NewsListingEmptyState } from "@/components/public/news/news-listing-empty-state";
import { PublicContainer } from "@/components/public/public-container";
import { PublicSectionHeading } from "@/components/public/public-section-heading";
import { getCurrentPublicUser } from "@/lib/auth/guards";
import {
  listPublicNews,
  listPublicNewsCategories,
} from "@/services/public-news.service";

export const metadata: Metadata = {
  title: "News | APOLOGETICS መፅሔት",
  description:
    "Explore published Islamic news and articles from APOLOGETICS መፅሔት.",
};

type NewsPageProps = {
  searchParams: Promise<{
    category?: string | string[];
  }>;
};

export default async function NewsPage({ searchParams }: NewsPageProps) {
  await connection();

  const { category } = await searchParams;
  const categoryValue = Array.isArray(category) ? category[0] : category;
  const selectedCategorySlug = categoryValue?.trim() || undefined;

  const [categories, currentUser] = await Promise.all([
    listPublicNewsCategories(),
    getCurrentPublicUser(),
  ]);
  const newsResult = await listPublicNews({
      categorySlug: selectedCategorySlug,
      limit: 9,
    }, currentUser?.id);

  return (
    <main className="min-w-0 flex-1 bg-public-background">
      <section
        aria-labelledby="news-page-title"
        className="border-b border-public-border bg-public-primary-soft/40"
      >
        <PublicContainer className="py-8 sm:py-10">
          <h1
            id="news-page-title"
            className="break-words font-editorial text-3xl font-bold leading-tight text-public-text sm:text-4xl"
          >
            News
          </h1>
          <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-public-muted-text sm:text-base">
            Read thoughtful Islamic news, analysis, and articles that connect
            faith, knowledge, and contemporary life.
          </p>
        </PublicContainer>
      </section>

      <section aria-label="Latest News" className="py-8 sm:py-10 lg:py-12">
        <PublicContainer>
          <NewsCategoryFilter
            categories={categories}
            selectedCategorySlug={selectedCategorySlug}
          />

          <PublicSectionHeading
            title="Latest News"
            description="Explore the latest published stories and perspectives from APOLOGETICS መፅሔት."
            className="mt-8"
          />

          {newsResult.articles.length > 0 ? (
            <NewsFeed
              key={selectedCategorySlug ?? "all"}
              initialArticles={newsResult.articles}
              initialNextCursor={newsResult.nextCursor}
              initialHasMore={newsResult.hasMore}
              categorySlug={selectedCategorySlug}
            />
          ) : (
            <div className="mt-6">
              <NewsListingEmptyState
                hasCategoryFilter={Boolean(selectedCategorySlug)}
              />
            </div>
          )}
        </PublicContainer>
      </section>
    </main>
  );
}
