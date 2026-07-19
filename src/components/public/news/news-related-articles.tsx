import { PublicContainer } from "@/components/public/public-container";
import { PublicLinkButton } from "@/components/public/public-link-button";
import { PublicNewsCard } from "@/components/public/public-news-card";
import { PublicSectionHeading } from "@/components/public/public-section-heading";
import type { RelatedPublicNewsArticle } from "@/services/public-news-detail.service";

type NewsRelatedArticlesProps = {
  articles: RelatedPublicNewsArticle[];
};

export function NewsRelatedArticles({
  articles,
}: NewsRelatedArticlesProps) {
  const visibleArticles = articles.slice(0, 3);

  if (visibleArticles.length === 0) {
    return null;
  }

  return (
    <section
      className="border-t border-public-border bg-public-primary-soft/35 py-10 sm:py-12 lg:py-14"
    >
      <PublicContainer>
        <PublicSectionHeading
          title="Related Articles"
          action={
            <PublicLinkButton href="/news" variant="text" size="sm">
              View All News
            </PublicLinkButton>
          }
        />

        <div className="mt-6 grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleArticles.map((article) => (
            <PublicNewsCard key={article.id} article={article} />
          ))}
        </div>
      </PublicContainer>
    </section>
  );
}
