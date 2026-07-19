import { PublicCard } from "@/components/public/public-card";
import { PublicContainer } from "@/components/public/public-container";
import { PublicLinkButton } from "@/components/public/public-link-button";
import {
  PublicNewsCard,
  type PublicNewsArticle,
} from "@/components/public/public-news-card";
import { PublicSectionHeading } from "@/components/public/public-section-heading";
import { cn } from "@/lib/utils";

type HomeLatestNewsProps = {
  articles: PublicNewsArticle[];
  className?: string;
};

export function HomeLatestNews({
  articles,
  className,
}: HomeLatestNewsProps) {
  const visibleArticles = articles.slice(0, 5);

  return (
    <section
      aria-label="Latest News"
      className={cn("pb-6 sm:pb-8", className)}
    >
      <PublicContainer>
        <PublicSectionHeading
          title="Latest News"
          action={
            <PublicLinkButton href="/news" variant="text" size="sm">
              View all news →
            </PublicLinkButton>
          }
          className="[&_h2]:scroll-mt-24"
        />

        {visibleArticles.length ? (
          <div
            className={cn(
              "mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] xl:grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))]",
              visibleArticles.length === 1 && "sm:max-w-sm",
              visibleArticles.length === 2 && "xl:mx-auto xl:max-w-5xl",
            )}
          >
            {visibleArticles.map((article) => (
              <PublicNewsCard
                key={article.id}
                article={article}
                variant="compact"
              />
            ))}
          </div>
        ) : (
          <PublicCard className="mt-6 px-5 py-8 text-center sm:px-8">
            <p className="text-sm leading-6 text-public-muted-text sm:text-base">
              No published news is currently available.
            </p>
          </PublicCard>
        )}
      </PublicContainer>
    </section>
  );
}
