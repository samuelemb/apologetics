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
  return (
    <section
      aria-label="Latest News"
      className={cn("pb-12 sm:pb-16", className)}
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

        {articles.length ? (
          <div className="mt-6 grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <PublicNewsCard key={article.id} article={article} />
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
