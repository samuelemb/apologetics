import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { NewsArticleBody } from "@/components/public/news/news-article-body";
import { NewsArticleHeader } from "@/components/public/news/news-article-header";
import { NewsRelatedArticles } from "@/components/public/news/news-related-articles";
import { NewsViewTracker } from "@/components/public/news/news-view-tracker";
import { PublicContentLikeButton } from "@/components/public/public-content-like-button";
import { PublicContentComments } from "@/components/public/public-content-comments";
import { PublicContainer } from "@/components/public/public-container";
import { ContentType } from "@/generated/prisma/enums";
import { getCurrentPublicUser } from "@/lib/auth/guards";
import { getContentLikeSummary } from "@/services/content-like.service";
import { getPublicContentComments } from "@/services/content-comment.service";
import {
  getPublicNewsArticleBySlug,
  getRelatedPublicNewsArticles,
} from "@/services/public-news-detail.service";

type NewsArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const genericNewsDescription =
  "Read published Islamic news and articles from APOLOGETICS መፅሔት.";

function normalizeMetadataDescription(excerpt: string | null) {
  const normalizedExcerpt = excerpt?.replace(/\s+/g, " ").trim();

  if (!normalizedExcerpt) {
    return genericNewsDescription;
  }

  if (normalizedExcerpt.length <= 160) {
    return normalizedExcerpt;
  }

  return `${normalizedExcerpt.slice(0, 157).trimEnd()}...`;
}

function toValidIsoDate(value: Date | null) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : undefined;
}

export async function generateMetadata({
  params,
}: NewsArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublicNewsArticleBySlug(slug);

  if (!article) {
    return {
      title: "News | APOLOGETICS መፅሔት",
      description: genericNewsDescription,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${article.title} | APOLOGETICS መፅሔት`;
  const description = normalizeMetadataDescription(article.excerpt);
  const publishedTime = toValidIsoDate(article.publishedAt);
  const modifiedTime = toValidIsoDate(article.updatedAt);
  const coverImageUrl = article.coverImageUrl?.trim() || undefined;
  const coverImageAlt = article.coverImageAlt?.trim() || article.title;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(coverImageUrl
        ? {
            images: [
              {
                url: coverImageUrl,
                alt: coverImageAlt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: coverImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(coverImageUrl ? { images: [coverImageUrl] } : {}),
    },
  };
}

export default async function NewsArticlePage({
  params,
}: NewsArticlePageProps) {
  await connection();

  const { slug } = await params;
  const article = await getPublicNewsArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const [relatedArticles, currentUser] = await Promise.all([
    getRelatedPublicNewsArticles({
    articleId: article.id,
    categorySlug: article.category?.slug,
    tagSlugs: article.tags.map((tag) => tag.slug),
    }),
    getCurrentPublicUser(),
  ]);
  const likeSummary = await getContentLikeSummary(
    { contentType: ContentType.NEWS, contentId: article.id },
    currentUser?.id,
  );
  const comments = await getPublicContentComments(
    { contentType: ContentType.NEWS, contentId: article.id },
    currentUser?.id,
  );

  return (
    <main className="min-w-0 flex-1 bg-public-background">
      <NewsViewTracker slug={article.slug} />

      <PublicContainer className="py-6 sm:py-8 lg:py-12">
        <div className="mx-auto min-w-0 max-w-4xl">
          <nav aria-label="Breadcrumb">
            <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-public-muted-text">
              <li className="inline-flex items-center gap-2">
                <Link
                  href="/"
                  className="rounded-sm transition-colors hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"
                >
                  Home
                </Link>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </li>
              <li className="inline-flex items-center gap-2">
                <Link
                  href="/news"
                  className="rounded-sm transition-colors hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"
                >
                  News
                </Link>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </li>
              <li
                aria-current="page"
                className="min-w-0 break-words text-public-text"
              >
                {article.title}
              </li>
            </ol>
          </nav>

          <article className="mt-7 sm:mt-8">
            <NewsArticleHeader article={article} />

            {article.coverImageUrl ? (
              <figure className="mt-8 overflow-hidden rounded-[var(--public-radius)] border border-public-border bg-public-primary-soft shadow-[var(--public-shadow)]">
                <div className="aspect-[16/9] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.coverImageUrl}
                    alt={article.coverImageAlt?.trim() || article.title}
                    decoding="async"
                    className="size-full object-cover"
                  />
                </div>
              </figure>
            ) : null}

            <NewsArticleBody content={article.content} tags={article.tags} />
            <section className="mt-8 border-t border-public-border pt-5" aria-label="Article likes">
              <PublicContentLikeButton contentType={ContentType.NEWS} contentId={article.id} initialCount={likeSummary.count} initialLiked={likeSummary.liked} />
            </section>
            <PublicContentComments contentType={ContentType.NEWS} contentId={article.id} {...comments} />
          </article>
        </div>
      </PublicContainer>

      <NewsRelatedArticles articles={relatedArticles} />
    </main>
  );
}
