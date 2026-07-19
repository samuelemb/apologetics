import { PublicContainer } from "@/components/public/public-container";
import { PublicLinkButton } from "@/components/public/public-link-button";
import { PublicMagazineCard } from "@/components/public/public-magazine-card";
import type { RelatedPublicMagazineIssue } from "@/services/public-magazine-detail.service";

type MagazineRelatedIssuesProps = {
  issues: RelatedPublicMagazineIssue[];
};

export function MagazineRelatedIssues({
  issues,
}: MagazineRelatedIssuesProps) {
  const visibleIssues = issues.slice(0, 3);

  if (visibleIssues.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-public-border bg-public-primary-soft/35 py-10 sm:py-12 lg:py-14">
      <PublicContainer>
        <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="break-words font-editorial text-2xl font-bold leading-tight text-public-text sm:text-3xl">
            Related Issues
          </h2>
          <PublicLinkButton href="/magazine" variant="text" size="sm">
            View All Issues
          </PublicLinkButton>
        </header>

        <div className="mt-6 grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleIssues.map((issue) => (
            <PublicMagazineCard
              key={issue.id}
              magazine={issue}
              variant="default"
            />
          ))}
        </div>
      </PublicContainer>
    </section>
  );
}
