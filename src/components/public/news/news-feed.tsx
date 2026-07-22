"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  PublicNewsCard,
  type PublicNewsCardArticle,
} from "@/components/public/public-news-card";

type NewsFeedProps = {
  initialArticles: PublicNewsCardArticle[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  categorySlug?: string;
};

type NewsFeedResponse = {
  articles: PublicNewsCardArticle[];
  nextCursor: string | null;
  hasMore: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isAuthor(value: unknown) {
  return (
    value === null ||
    (isRecord(value) && typeof value.name === "string")
  );
}

function isCategory(value: unknown) {
  return (
    value === null ||
    (isRecord(value) &&
      typeof value.name === "string" &&
      typeof value.slug === "string")
  );
}

function isNewsArticle(value: unknown): value is PublicNewsCardArticle {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.slug === "string" &&
    isNullableString(value.excerpt) &&
    isNullableString(value.coverImageUrl) &&
    isNullableString(value.coverImageAlt) &&
    isNullableString(value.publishedAt) &&
    typeof value.viewCount === "number" &&
    Number.isFinite(value.viewCount) &&
    typeof value.likeCount === "number" &&
    Number.isFinite(value.likeCount) &&
    typeof value.commentCount === "number" &&
    Number.isFinite(value.commentCount) &&
    typeof value.liked === "boolean" &&
    isAuthor(value.author) &&
    isCategory(value.category)
  );
}

function isNewsFeedResponse(value: unknown): value is NewsFeedResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.articles) &&
    value.articles.every(isNewsArticle) &&
    (value.nextCursor === null ||
      (typeof value.nextCursor === "string" && value.nextCursor.length > 0)) &&
    typeof value.hasMore === "boolean"
  );
}

export function NewsFeed({
  initialArticles,
  initialNextCursor,
  initialHasMore,
  categorySlug,
}: NewsFeedProps) {
  const [articles, setArticles] =
    useState<PublicNewsCardArticle[]>(initialArticles);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const activeCursorRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const loadMore = useCallback(
    async (isRetry = false) => {
      const cursor = nextCursor;

      if (
        !hasMore ||
        !cursor ||
        isLoadingRef.current ||
        activeCursorRef.current === cursor ||
        (error && !isRetry)
      ) {
        return;
      }

      isLoadingRef.current = true;
      activeCursorRef.current = cursor;
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const searchParams = new URLSearchParams({
        cursor,
        limit: "9",
      });

      if (categorySlug) {
        searchParams.set("category", categorySlug);
      }

      try {
        const response = await fetch(`/api/public/news?${searchParams}`, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("News request failed");
        }

        const payload: unknown = await response.json();

        if (!isNewsFeedResponse(payload)) {
          throw new Error("News response was invalid");
        }

        if (
          !isMountedRef.current ||
          controller.signal.aborted ||
          activeCursorRef.current !== cursor
        ) {
          return;
        }

        setArticles((currentArticles) => {
          const articleIds = new Set(
            currentArticles.map((article) => article.id),
          );
          const uniqueArticles = payload.articles.filter((article) => {
            if (articleIds.has(article.id)) {
              return false;
            }

            articleIds.add(article.id);
            return true;
          });

          return uniqueArticles.length > 0
            ? [...currentArticles, ...uniqueArticles]
            : currentArticles;
        });
        setNextCursor(payload.nextCursor);
        setHasMore(payload.hasMore);
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        if (isMountedRef.current) {
          setError("Unable to load more news.");
        }
      } finally {
        if (activeCursorRef.current === cursor) {
          activeCursorRef.current = null;
        }
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }

        isLoadingRef.current = false;
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [categorySlug, error, hasMore, nextCursor],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (
      !sentinel ||
      !hasMore ||
      !nextCursor ||
      isLoading ||
      error ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      {
        rootMargin: "240px 0px",
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [error, hasMore, isLoading, loadMore, nextCursor]);

  const canLoadMore = hasMore && nextCursor !== null;

  return (
    <>
      <div
        id="news-feed-grid"
        className="mt-6 grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        {articles.map((article) => (
          <PublicNewsCard key={article.id} article={article} />
        ))}
      </div>

      {canLoadMore ? (
        <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      ) : null}

      <div className="mt-6 flex min-w-0 flex-col items-center gap-3 text-center">
        <div
          aria-live="polite"
          aria-atomic="true"
          className="min-h-5 max-w-xl text-sm leading-5 text-public-muted-text"
        >
          {isLoading ? (
            <p>Loading more news...</p>
          ) : error ? (
            <p>{error}</p>
          ) : !canLoadMore ? (
            <p>You have reached the end of the News archive.</p>
          ) : null}
        </div>

        {canLoadMore ? (
          <button
            type="button"
            aria-controls="news-feed-grid"
            disabled={isLoading}
            onClick={() => void loadMore(Boolean(error))}
            className="inline-flex min-h-11 max-w-full items-center justify-center rounded-[var(--public-radius)] border border-public-primary bg-public-surface px-6 py-2 text-sm font-semibold leading-5 text-public-primary shadow-[var(--public-shadow)] transition-[background-color,border-color,color,box-shadow] hover:bg-public-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary disabled:cursor-wait disabled:opacity-70"
          >
            {isLoading ? "Loading..." : error ? "Retry" : "Load More News"}
          </button>
        ) : null}
      </div>
    </>
  );
}
