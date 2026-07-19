import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { PublicCard } from "@/components/public/public-card";
import type { EventScheduleStatus } from "@/components/public/events/event-detail-header";
import type { PublicEventDetail } from "@/services/public-event-detail.service";

type EventDetailInformationProps = {
  event: PublicEventDetail;
  status: EventScheduleStatus;
  now: Date;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isSameUtcDay(first: Date, second: Date) {
  return (
    first.getUTCFullYear() === second.getUTCFullYear() &&
    first.getUTCMonth() === second.getUTCMonth() &&
    first.getUTCDate() === second.getUTCDate()
  );
}

function getSafeAbsoluteUrl(value: string | null) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  try {
    const url = new URL(normalizedValue);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function ScheduleValue({
  startAt,
  endAt,
}: {
  startAt: Date;
  endAt: Date | null;
}) {
  if (!endAt) {
    return (
      <time dateTime={startAt.toISOString()}>
        {dateTimeFormatter.format(startAt)}
      </time>
    );
  }

  if (isSameUtcDay(startAt, endAt)) {
    return (
      <>
        <time dateTime={startAt.toISOString()}>
          {dateFormatter.format(startAt)}, {timeFormatter.format(startAt)}
        </time>{" "}
        – <time dateTime={endAt.toISOString()}>{timeFormatter.format(endAt)}</time>
      </>
    );
  }

  return (
    <>
      <time dateTime={startAt.toISOString()}>
        {dateTimeFormatter.format(startAt)}
      </time>{" "}
      –{" "}
      <time dateTime={endAt.toISOString()}>
        {dateTimeFormatter.format(endAt)}
      </time>
    </>
  );
}

function InformationItem({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-public-muted-text">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium leading-6 text-public-text [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

const externalActionClasses =
  "inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-[var(--public-radius)] border border-transparent bg-public-primary px-4 text-sm font-semibold leading-5 text-white shadow-sm transition-colors hover:bg-public-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary";
const secondaryExternalActionClasses =
  "inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-[var(--public-radius)] border border-public-border bg-public-surface px-4 text-sm font-semibold leading-5 text-public-text transition-colors hover:border-public-primary/35 hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary";

export function EventDetailInformation({
  event,
  status,
  now,
}: EventDetailInformationProps) {
  const startAt = isValidDate(event.startAt) ? event.startAt : null;
  const endAt = isValidDate(event.endAt) ? event.endAt : null;
  const registrationDeadline = isValidDate(event.registrationDeadline)
    ? event.registrationDeadline
    : null;
  const location = event.location?.trim() || null;
  const capacity =
    Number.isInteger(event.capacity) && (event.capacity ?? 0) > 0
      ? event.capacity
      : null;
  const registrationUrl = getSafeAbsoluteUrl(event.registrationUrl);
  const onlineUrl = getSafeAbsoluteUrl(event.onlineUrl);
  const isPast = status === "Past Event";
  const registrationClosed = Boolean(
    registrationUrl &&
      !isPast &&
      registrationDeadline &&
      registrationDeadline.getTime() < now.getTime(),
  );
  const showRegistrationLink = Boolean(
    registrationUrl && !isPast && !registrationClosed,
  );
  const showOnlineLink = Boolean(event.isOnline && onlineUrl && !isPast);

  return (
    <section aria-labelledby="event-information-title" className="mt-8">
      <PublicCard className="p-5 sm:p-6">
        <h2
          id="event-information-title"
          className="font-editorial text-2xl font-bold text-public-text"
        >
          Event information
        </h2>

        <dl className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {startAt ? (
            <InformationItem label="Schedule" className="sm:col-span-2">
              <ScheduleValue startAt={startAt} endAt={endAt} />
            </InformationItem>
          ) : null}
          <InformationItem label="Format">
            {event.isOnline ? "Online" : "Physical"}
          </InformationItem>
          {!event.isOnline && location ? (
            <InformationItem label="Location">{location}</InformationItem>
          ) : null}
          {registrationDeadline ? (
            <InformationItem label="Registration deadline">
              <time dateTime={registrationDeadline.toISOString()}>
                {dateTimeFormatter.format(registrationDeadline)}
              </time>
            </InformationItem>
          ) : null}
          {capacity ? (
            <InformationItem label="Capacity">
              {capacity.toLocaleString("en")}
            </InformationItem>
          ) : null}
        </dl>

        {showRegistrationLink || showOnlineLink || registrationClosed ? (
          <div className="mt-6 flex min-w-0 flex-wrap items-center gap-3 border-t border-public-border pt-5">
            {showRegistrationLink && registrationUrl ? (
              <a
                href={registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Register for this event (opens in a new tab)"
                className={externalActionClasses}
              >
                <span className="min-w-0 break-words text-center">
                  Register for this event
                </span>
                <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
              </a>
            ) : null}
            {showOnlineLink && onlineUrl ? (
              <a
                href={onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join online event (opens in a new tab)"
                className={secondaryExternalActionClasses}
              >
                <span className="min-w-0 break-words text-center">
                  Join online event
                </span>
                <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
              </a>
            ) : null}
            {registrationClosed ? (
              <p className="text-sm font-semibold text-public-muted-text">
                Registration closed
              </p>
            ) : null}
          </div>
        ) : null}
      </PublicCard>
    </section>
  );
}
