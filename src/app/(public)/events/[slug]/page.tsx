import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { EventDetailBody } from "@/components/public/events/event-detail-body";
import { EventDetailHeader } from "@/components/public/events/event-detail-header";
import type { EventScheduleStatus } from "@/components/public/events/event-detail-header";
import { EventDetailInformation } from "@/components/public/events/event-detail-information";
import { EventRelatedEvents } from "@/components/public/events/event-related-events";
import { EventViewTracker } from "@/components/public/events/event-view-tracker";
import { PublicContentLikeButton } from "@/components/public/public-content-like-button";
import { PublicContentComments } from "@/components/public/public-content-comments";
import { PublicContainer } from "@/components/public/public-container";
import { PublicContentImage } from "@/components/public/public-content-image";
import { PublicLinkButton } from "@/components/public/public-link-button";
import { ContentType } from "@/generated/prisma/enums";
import { getCurrentPublicUser } from "@/lib/auth/guards";
import { getContentLikeSummary } from "@/services/content-like.service";
import { getPublicContentComments } from "@/services/content-comment.service";
import {
  getPublicEventBySlug,
  getRelatedPublicEvents,
} from "@/services/public-event-detail.service";

type EventDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const genericEventDescription =
  "Discover published Islamic events and community programs from APOLOGETICS መፅሔት.";

function normalizeMetadataDescription(
  summary: string | null,
  content: string,
) {
  const normalizedSummary = summary?.replace(/\s+/g, " ").trim();
  const normalizedContent = content.replace(/\s+/g, " ").trim();
  const description =
    normalizedSummary || normalizedContent || genericEventDescription;

  if (description.length <= 160) {
    return description;
  }

  return `${description.slice(0, 157).trimEnd()}...`;
}

function toValidIsoDate(value: Date | null) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : undefined;
}

export async function generateMetadata({
  params,
}: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug.trim());

  if (!event) {
    return {
      title: "Event | APOLOGETICS መፅሔት",
      description: genericEventDescription,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${event.title} | APOLOGETICS መፅሔት`;
  const description = normalizeMetadataDescription(
    event.summary,
    event.content,
  );
  const publishedTime = toValidIsoDate(event.publishedAt);
  const modifiedTime = toValidIsoDate(event.updatedAt);
  const coverImageUrl = event.coverImageUrl?.trim() || undefined;
  const coverImageAlt = event.coverImageAlt?.trim() || event.title;

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

function getEventScheduleStatus(
  startAt: Date,
  endAt: Date | null,
  now: Date,
): EventScheduleStatus {
  if (startAt.getTime() > now.getTime()) {
    return "Upcoming Event";
  }

  if (endAt && endAt.getTime() >= now.getTime()) {
    return "Event in Progress";
  }

  return "Past Event";
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  await connection();

  const { slug } = await params;
  const event = await getPublicEventBySlug(slug.trim());

  if (!event) {
    notFound();
  }

  const [relatedEvents, currentUser] = await Promise.all([
    getRelatedPublicEvents(event),
    getCurrentPublicUser(),
  ]);
  const likeSummary = await getContentLikeSummary(
    { contentType: ContentType.EVENT, contentId: event.id },
    currentUser?.id,
  );
  const comments = await getPublicContentComments(
    { contentType: ContentType.EVENT, contentId: event.id },
    currentUser?.id,
  );
  const now = new Date();
  const status = getEventScheduleStatus(event.startAt, event.endAt, now);
  const coverImageUrl = event.coverImageUrl?.trim() || null;

  return (
    <main className="min-w-0 flex-1 bg-public-background">
      <EventViewTracker slug={event.slug} />

      <PublicContainer className="py-6 sm:py-8 lg:py-12">
        <div className="mx-auto min-w-0 max-w-5xl">
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
                  href="/events"
                  className="rounded-sm transition-colors hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"
                >
                  Events
                </Link>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </li>
              <li
                aria-current="page"
                className="min-w-0 break-words text-public-text [overflow-wrap:anywhere]"
              >
                {event.title}
              </li>
            </ol>
          </nav>

          <article className="mt-7 sm:mt-8">
            <EventDetailHeader event={event} status={status} />

            {coverImageUrl ? (
              <figure className="mt-7 overflow-hidden rounded-[var(--public-radius)] border border-public-border bg-public-primary-soft shadow-[var(--public-shadow)] sm:mt-8">
                <div className="aspect-[16/9] overflow-hidden sm:aspect-[16/7]">
                  <PublicContentImage
                    src={coverImageUrl}
                    alt={event.coverImageAlt?.trim() || event.title}
                    className="size-full"
                    imageClassName="object-cover"
                  />
                </div>
              </figure>
            ) : null}

            <EventDetailInformation event={event} status={status} now={now} />
            <EventDetailBody content={event.content} tags={event.tags} />

            <section className="mt-8 border-t border-public-border pt-5" aria-label="Event likes">
              <PublicContentLikeButton contentType={ContentType.EVENT} contentId={event.id} initialCount={likeSummary.count} initialLiked={likeSummary.liked} />
            </section>
            <PublicContentComments contentType={ContentType.EVENT} contentId={event.id} {...comments} />

            <div className="mt-10 border-t border-public-border pt-6">
              <PublicLinkButton href="/events" variant="text" size="sm">
                Back to Events
              </PublicLinkButton>
            </div>
          </article>
        </div>
      </PublicContainer>

      <EventRelatedEvents events={relatedEvents} />
    </main>
  );
}
