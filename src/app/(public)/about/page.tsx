import type { Metadata } from "next";

import { PublicCard } from "@/components/public/public-card";
import { PublicContainer } from "@/components/public/public-container";
import { PublicLinkButton } from "@/components/public/public-link-button";
import { PublicSectionHeading } from "@/components/public/public-section-heading";

export const metadata: Metadata = {
  title: "About Us | APOLOGETICS መጽሔት",
  description:
    "Learn about APOLOGETICS መጽሔት, an Islamic editorial platform dedicated to knowledge, thoughtful discussion, education, and presenting Islam with clarity.",
};

const values = [
  {
    name: "Truth",
    description: "We value accuracy, honesty, and careful presentation.",
  },
  {
    name: "Knowledge",
    description: "We create educational content that supports learning and inquiry.",
  },
  {
    name: "Clarity",
    description: "We explain ideas in accessible and considered language.",
  },
  {
    name: "Respect",
    description: "We engage questions and readers with care and courtesy.",
  },
  {
    name: "Responsibility",
    description: "We approach each publication with thoughtful editorial judgment.",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="min-w-0 flex-1 bg-public-background">
      <section
        aria-labelledby="about-heading"
        className="border-b border-public-border"
      >
        <PublicContainer className="py-10 sm:py-14 lg:py-16">
          <div className="max-w-4xl">
            <div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-public-primary">
              <span aria-hidden="true" className="h-px w-8 bg-public-primary" />
              <span>About APOLOGETICS መጽሔት</span>
            </div>
            <h1
              id="about-heading"
              className="break-words font-editorial text-4xl font-bold leading-tight text-public-text sm:text-5xl"
            >
              About Us
            </h1>
            <p className="mt-5 max-w-3xl break-words text-lg leading-8 text-public-text sm:text-xl sm:leading-9">
              APOLOGETICS መጽሔት is an Islamic editorial and educational
              platform focused on sharing knowledge and encouraging thoughtful,
              informed discussion.
            </p>
            <p className="mt-4 max-w-3xl break-words text-base leading-7 text-public-muted-text">
              We publish news, educational articles, events, and digital Magazine
              issues to make useful learning available across clear and accessible
              formats.
            </p>
          </div>
        </PublicContainer>
      </section>

      <section aria-labelledby="purpose-heading">
        <PublicContainer className="py-10 sm:py-14 lg:py-16">
          <div className="grid min-w-0 gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <PublicSectionHeading
              eyebrow="Our purpose"
              title="Knowledge presented with clarity"
            />
            <div className="min-w-0 border-l-2 border-public-primary pl-5 sm:pl-7">
              <h2 id="purpose-heading" className="sr-only">
                Our purpose
              </h2>
              <p className="break-words text-base leading-7 text-public-text sm:text-lg sm:leading-8">
                APOLOGETICS መጽሔት exists to present Islamic knowledge clearly,
                encourage thoughtful discussion, and help readers understand and
                respond to questions about Islam.
              </p>
              <p className="mt-4 break-words text-sm leading-6 text-public-muted-text sm:text-base sm:leading-7">
                Our role is editorial and educational. We aim to make important
                ideas easier to explore without presenting the platform as an
                official religious authority.
              </p>
            </div>
          </div>
        </PublicContainer>
      </section>

      <PublicContainer className="pb-10 sm:pb-14 lg:pb-16">
        <div className="grid min-w-0 gap-5 md:grid-cols-2">
          <section aria-labelledby="mission-heading">
            <PublicCard className="h-full p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-public-primary">
                Our mission
              </p>
              <h2
                id="mission-heading"
                className="mt-3 break-words font-editorial text-2xl font-bold leading-tight text-public-text sm:text-3xl"
              >
                Learning that engages real questions
              </h2>
              <p className="mt-4 break-words text-sm leading-6 text-public-muted-text sm:text-base sm:leading-7">
                Our mission is to publish reliable Islamic educational content,
                communicate clearly and respectfully, and engage thoughtfully with
                contemporary questions. We support learning through articles,
                events, and digital Magazine publications.
              </p>
            </PublicCard>
          </section>

          <section aria-labelledby="vision-heading">
            <PublicCard className="h-full p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-public-primary">
                Our vision
              </p>
              <h2
                id="vision-heading"
                className="mt-3 break-words font-editorial text-2xl font-bold leading-tight text-public-text sm:text-3xl"
              >
                A trusted and accessible platform
              </h2>
              <p className="mt-4 break-words text-sm leading-6 text-public-muted-text sm:text-base sm:leading-7">
                Our vision is to become a trusted, accessible platform for Islamic
                learning and informed discussion—one that helps readers approach
                meaningful topics with greater understanding and clarity.
              </p>
            </PublicCard>
          </section>
        </div>
      </PublicContainer>

      <section
        aria-labelledby="values-heading"
        className="border-y border-public-border bg-public-primary-soft/45"
      >
        <PublicContainer className="py-10 sm:py-14 lg:py-16">
          <PublicSectionHeading
            eyebrow="Our values"
            title="What guides our work"
            description="Five principles shape how we approach our editorial and educational work."
          />
          <h2 id="values-heading" className="sr-only">
            Our values
          </h2>
          <ul className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {values.map((value, index) => (
              <li key={value.name} className="min-w-0">
                <PublicCard className="h-full p-5 shadow-none">
                  <span
                    aria-hidden="true"
                    className="font-editorial text-sm font-bold text-public-primary"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 break-words font-editorial text-xl font-bold text-public-text">
                    {value.name}
                  </h3>
                  <p className="mt-2 break-words text-sm leading-6 text-public-muted-text">
                    {value.description}
                  </p>
                </PublicCard>
              </li>
            ))}
          </ul>
        </PublicContainer>
      </section>

      <section aria-labelledby="explore-heading">
        <PublicContainer className="py-10 sm:py-14">
          <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-public-primary">
                Continue exploring
              </p>
              <h2
                id="explore-heading"
                className="mt-2 break-words font-editorial text-2xl font-bold leading-tight text-public-text sm:text-3xl"
              >
                Read and learn with us
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-public-muted-text sm:text-base">
                Explore our latest reporting and digital publications.
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-3 sm:shrink-0 sm:justify-end">
              <PublicLinkButton href="/news">Read Our News</PublicLinkButton>
              <PublicLinkButton href="/magazine" variant="secondary">
                Read the Magazine
              </PublicLinkButton>
            </div>
          </div>
        </PublicContainer>
      </section>
    </main>
  );
}
