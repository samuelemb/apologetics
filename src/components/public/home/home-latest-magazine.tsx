import { PublicContainer } from "@/components/public/public-container";
import { PublicLinkButton } from "@/components/public/public-link-button";
import {
  PublicMagazineCard,
  type PublicMagazine,
} from "@/components/public/public-magazine-card";
import { PublicSectionHeading } from "@/components/public/public-section-heading";

type HomeLatestMagazineProps = {
  magazine: PublicMagazine;
};

export function HomeLatestMagazine({ magazine }: HomeLatestMagazineProps) {
  return (
    <section
      aria-label="Latest Magazine"
      className="border-t border-public-border bg-public-primary-soft/35 py-12 sm:py-16"
    >
      <PublicContainer>
        <PublicSectionHeading
          title="Latest Magazine"
          action={
            <PublicLinkButton href="/magazine" variant="text" size="sm">
              View all issues →
            </PublicLinkButton>
          }
        />
        <PublicMagazineCard
          magazine={magazine}
          variant="featured"
          className="mt-6"
        />
      </PublicContainer>
    </section>
  );
}
