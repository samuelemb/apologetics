import Link from "next/link";

import type { PublicMagazineIssueDetail } from "@/services/public-magazine-detail.service";

type MagazineIssueHeaderProps = {
  issue: PublicMagazineIssueDetail;
  description: string | null;
};

function buildCategoryHref(categorySlug: string) {
  const params = new URLSearchParams();
  params.set("category", categorySlug);
  return `/magazine?${params.toString()}`;
}

function withLabel(value: string, label: "Issue" | "Volume") {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.toLowerCase().startsWith(label.toLowerCase())
    ? normalizedValue
    : `${label} ${normalizedValue}`;
}

export function MagazineIssueHeader({
  issue,
  description,
}: MagazineIssueHeaderProps) {
  const issueNumber = withLabel(issue.issueNumber, "Issue");
  const volume = issue.volume ? withLabel(issue.volume, "Volume") : null;

  return (
    <header className="min-w-0">
      {issue.category ? (
        <Link
          href={buildCategoryHref(issue.category.slug)}
          className="inline-flex min-h-9 max-w-full items-center rounded-[var(--public-radius)] bg-public-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-public-primary transition-colors hover:bg-public-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"
        >
          <span className="break-words [overflow-wrap:anywhere]">
            {issue.category.name}
          </span>
        </Link>
      ) : null}

      {issueNumber || volume ? (
        <p className="mt-4 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-[0.08em] text-public-muted-text lg:hidden">
          {issueNumber ? (
            <span className="break-words [overflow-wrap:anywhere]">
              {issueNumber}
            </span>
          ) : null}
          {issueNumber && volume ? <span aria-hidden="true">·</span> : null}
          {volume ? (
            <span className="break-words [overflow-wrap:anywhere]">
              {volume}
            </span>
          ) : null}
        </p>
      ) : null}

      <h1 className="mt-4 break-words font-editorial text-3xl font-bold leading-[1.1] text-public-text [overflow-wrap:anywhere] sm:text-4xl">
        {issue.title}
      </h1>

      <span
        aria-hidden="true"
        className="mt-5 block h-0.5 w-10 bg-public-primary"
      />

      {description ? (
        <p className="mt-4 max-w-3xl whitespace-pre-line break-words text-base leading-7 text-public-muted-text [overflow-wrap:anywhere] sm:text-lg sm:leading-8">
          {description}
        </p>
      ) : null}
    </header>
  );
}
