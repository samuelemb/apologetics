import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MagazineIssueDescription } from "@/components/public/magazine/magazine-issue-description";
import { MagazineIssueHeader } from "@/components/public/magazine/magazine-issue-header";
import { MagazineIssueInformation } from "@/components/public/magazine/magazine-issue-information";
import { MagazineRelatedIssues } from "@/components/public/magazine/magazine-related-issues";
import { MagazineViewTracker } from "@/components/public/magazine/magazine-view-tracker";
import { PublicContainer } from "@/components/public/public-container";
import { PublicContentImage } from "@/components/public/public-content-image";
import { PublicLinkButton } from "@/components/public/public-link-button";
import {
  getPublicMagazineIssueBySlug,
  getRelatedPublicMagazineIssues,
} from "@/services/public-magazine-detail.service";

type MagazineIssuePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const genericMagazineDescription =
  "Explore published issues of APOLOGETICS መፅሔት.";

function normalizeMetadataDescription(description: string | null) {
  const normalizedDescription = description?.replace(/\s+/g, " ").trim();
  const metadataDescription =
    normalizedDescription || genericMagazineDescription;

  if (metadataDescription.length <= 160) {
    return metadataDescription;
  }

  return `${metadataDescription.slice(0, 157).trimEnd()}...`;
}

function toValidIsoDate(value: Date | null) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : undefined;
}

export async function generateMetadata({
  params,
}: MagazineIssuePageProps): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getPublicMagazineIssueBySlug(slug.trim());

  if (!issue) {
    return {
      title: "Magazine Issue | APOLOGETICS መፅሔት",
      description: genericMagazineDescription,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${issue.title} | APOLOGETICS መፅሔት`;
  const description = normalizeMetadataDescription(issue.description);
  const publishedTime = toValidIsoDate(issue.publicationDate);
  const modifiedTime = toValidIsoDate(issue.updatedAt);
  const coverImageUrl = issue.coverImageUrl?.trim() || undefined;
  const coverImageAlt = issue.coverImageAlt?.trim() || issue.title;

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

function getDescriptionPlacement(description: string | null) {
  const normalizedDescription = description
    ?.replace(/\r\n?/g, "\n")
    .trim();

  if (!normalizedDescription) {
    return {
      headerDescription: null,
      bodyDescription: null,
    };
  }

  const useHeader =
    normalizedDescription.length <= 240 &&
    !/\n[\t ]*\n/.test(normalizedDescription);

  return {
    headerDescription: useHeader ? normalizedDescription : null,
    bodyDescription: useHeader ? null : normalizedDescription,
  };
}

export default async function MagazineIssuePage({
  params,
}: MagazineIssuePageProps) {
  await connection();

  const { slug } = await params;
  const issue = await getPublicMagazineIssueBySlug(slug.trim());

  if (!issue) {
    notFound();
  }

  const relatedIssues = await getRelatedPublicMagazineIssues(issue);

  const coverImageUrl = issue.coverImageUrl?.trim() || null;
  const { headerDescription, bodyDescription } = getDescriptionPlacement(
    issue.description,
  );

  return (
    <main className="min-w-0 flex-1 bg-public-background">
      <MagazineViewTracker slug={issue.slug} />

      <PublicContainer className="py-6 sm:py-8 lg:py-12">
        <div className="mx-auto min-w-0 max-w-6xl">
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
                  href="/magazine"
                  className="rounded-sm transition-colors hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"
                >
                  Magazine
                </Link>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </li>
              <li
                aria-current="page"
                className="min-w-0 break-words text-public-text [overflow-wrap:anywhere]"
              >
                {issue.title}
              </li>
            </ol>
          </nav>

          <article className="mt-7 sm:mt-8">
            <div className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(16rem,19rem)_minmax(0,1fr)] lg:gap-10">
              <figure className="mx-auto aspect-[3/4] w-full max-w-[19rem] overflow-hidden rounded-[var(--public-radius)] border border-public-border bg-public-primary-soft shadow-[var(--public-shadow)] lg:mx-0">
                <PublicContentImage
                  src={coverImageUrl}
                  alt={issue.coverImageAlt?.trim() || issue.title}
                  className="size-full"
                  imageClassName="object-cover"
                  fallbackClassName="bg-public-primary-soft"
                />
              </figure>

              <div className="min-w-0">
                <MagazineIssueHeader
                  issue={issue}
                  description={headerDescription}
                />
                <MagazineIssueInformation issue={issue} />
                <MagazineIssueDescription description={bodyDescription} />

                {issue.tags.length > 0 ? (
                  <section
                    aria-labelledby="magazine-topics-title"
                    className="mt-7 border-t border-public-border pt-6 sm:mt-8"
                  >
                    <h2
                      id="magazine-topics-title"
                      className="font-editorial text-xl font-bold text-public-text"
                    >
                      Topics
                    </h2>
                    <ul className="mt-3 flex min-w-0 flex-wrap gap-2">
                      {issue.tags.map((tag) => (
                        <li
                          key={tag.slug}
                          className="max-w-full rounded-[var(--public-radius)] border border-public-border bg-public-primary-soft px-3 py-1.5 text-sm font-semibold text-public-text"
                        >
                          <span className="break-words [overflow-wrap:anywhere]">
                            {tag.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <div className="mt-9 border-t border-public-border pt-5">
                  <PublicLinkButton
                    href="/magazine"
                    variant="text"
                    size="sm"
                  >
                    Back to Magazine
                  </PublicLinkButton>
                </div>
              </div>
            </div>
          </article>
        </div>
      </PublicContainer>

      <MagazineRelatedIssues issues={relatedIssues} />
    </main>
  );
}
