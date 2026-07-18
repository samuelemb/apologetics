import { PublicCard } from "@/components/public/public-card";
import { PublicLinkButton } from "@/components/public/public-link-button";

type NewsListingEmptyStateProps = {
  hasCategoryFilter: boolean;
};

export function NewsListingEmptyState({
  hasCategoryFilter,
}: NewsListingEmptyStateProps) {
  return (
    <PublicCard className="px-5 py-10 text-center sm:px-8 sm:py-12">
      <h3 className="font-editorial text-xl font-bold text-public-text sm:text-2xl">
        No News to show
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-public-muted-text sm:text-base">
        {hasCategoryFilter
          ? "No published News is currently available in this category."
          : "No published News is currently available."}
      </p>
      {hasCategoryFilter ? (
        <PublicLinkButton href="/news" variant="secondary" className="mt-6">
          View All News
        </PublicLinkButton>
      ) : null}
    </PublicCard>
  );
}
