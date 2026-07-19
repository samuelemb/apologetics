import { ExternalLink, FileText } from "lucide-react";
import type { ReactNode } from "react";

import { PublicCard } from "@/components/public/public-card";
import type { PublicMagazineIssueDetail } from "@/services/public-magazine-detail.service";

type MagazineIssueInformationProps = {
  issue: PublicMagazineIssueDetail;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function getSafePdfUrl(value: string | null) {
  const normalizedValue = value?.trim();

  if (!normalizedValue || !/^https?:\/\//i.test(normalizedValue)) {
    return false;
  }

  try {
    const url = new URL(normalizedValue);
    return Boolean(
      (url.protocol === "http:" || url.protocol === "https:") &&
        url.hostname,
    );
  } catch {
    return false;
  }
}

function formatFileSize(bytes: number | null) {
  if (
    typeof bytes !== "number" ||
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB"] as const;
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 || size >= 10 ? 0 : 1;
  return `${size.toFixed(precision).replace(/\.0$/, "")} ${units[unitIndex]}`;
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

export function MagazineIssueInformation({
  issue,
}: MagazineIssueInformationProps) {
  const publicationDate = isValidDate(issue.publicationDate)
    ? issue.publicationDate
    : null;
  const issueNumber = issue.issueNumber.trim() || null;
  const volume = issue.volume?.trim() || null;
  const pageCount =
    Number.isSafeInteger(issue.pageCount) && (issue.pageCount ?? 0) > 0
      ? issue.pageCount
      : null;
  const fileSize = formatFileSize(issue.pdfFileSize);
  const hasSafePdf = getSafePdfUrl(issue.pdfUrl);
  const trackedPdfHref = `/api/public/magazine/${encodeURIComponent(issue.slug)}/pdf`;

  return (
    <section
      aria-labelledby="magazine-information-title"
      className="mt-7 sm:mt-8"
    >
      <PublicCard className="p-5 sm:p-6">
        <h2
          id="magazine-information-title"
          className="font-editorial text-xl font-bold text-public-text sm:text-2xl"
        >
          Issue information
        </h2>
        <span
          aria-hidden="true"
          className="mt-3 block h-0.5 w-9 bg-public-primary"
        />

        <dl className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
          {publicationDate ? (
            <InformationItem label="Publication date">
              <time dateTime={publicationDate.toISOString()}>
                {dateFormatter.format(publicationDate)}
              </time>
            </InformationItem>
          ) : null}
          {issueNumber ? (
            <InformationItem label="Issue number" className="hidden lg:block">
              {issueNumber}
            </InformationItem>
          ) : null}
          {volume ? (
            <InformationItem label="Volume" className="hidden lg:block">
              {volume}
            </InformationItem>
          ) : null}
          {pageCount ? (
            <InformationItem label="Page count">
              {pageCount.toLocaleString("en")}
            </InformationItem>
          ) : null}
          {fileSize ? (
            <InformationItem label="File size">{fileSize}</InformationItem>
          ) : null}
          <InformationItem label="File format">PDF</InformationItem>
        </dl>

        <div className="mt-6 border-t border-public-border pt-5">
          {hasSafePdf ? (
            <a
              href={trackedPdfHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open magazine PDF in a new tab"
              className="inline-flex min-h-11 w-full max-w-full items-center justify-center gap-2 rounded-[var(--public-radius)] border border-transparent bg-public-primary px-4 text-sm font-semibold leading-5 text-white shadow-sm transition-colors hover:bg-public-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary sm:w-auto"
            >
              <FileText aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0 break-words text-center">
                Open magazine PDF
              </span>
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
            </a>
          ) : (
            <p className="text-sm font-semibold text-public-muted-text">
              PDF currently unavailable
            </p>
          )}
        </div>
      </PublicCard>
    </section>
  );
}
