import type { Metadata } from "next";
import { connection } from "next/server";

import { HomeFeaturedNews } from "@/components/public/home/home-featured-news";
import { HomeHeadlineStrip } from "@/components/public/home/home-headline-strip";
import { HomeLatestNews } from "@/components/public/home/home-latest-news";
import { HomeLatestMagazine } from "@/components/public/home/home-latest-magazine";
import { HomeUpcomingEvents } from "@/components/public/home/home-upcoming-events";
import { PublicCard } from "@/components/public/public-card";
import { PublicContainer } from "@/components/public/public-container";
import { getPublicHomeData } from "@/services/public-home.service";

export const metadata: Metadata = {
  title: "APOLOGETICS መፅሔት",
  description:
    "An Islamic news, events, and digital magazine platform for thoughtful learning and community engagement.",
};

export default async function HomePage() {
  await connection();

  const { featuredNews, latestNews, upcomingEvents, latestMagazine } =
    await getPublicHomeData();
  const hasPublishedNews = Boolean(featuredNews) || latestNews.length > 0;
  const headlineArticle = latestNews[0] ?? featuredNews;

  return (
    <main className="min-w-0 flex-1 bg-public-background">
      {headlineArticle ? (
        <HomeHeadlineStrip article={headlineArticle} />
      ) : null}

      {hasPublishedNews ? (
        <>
          {featuredNews ? <HomeFeaturedNews article={featuredNews} /> : null}
          {!featuredNews ? (
            <h1 className="sr-only">Latest news from APOLOGETICS መፅሔት</h1>
          ) : null}
          <HomeLatestNews
            articles={latestNews}
            className={featuredNews ? undefined : "pt-8 sm:pt-10 lg:pt-12"}
          />
        </>
      ) : (
        <PublicContainer className="py-12 sm:py-16">
          <PublicCard className="px-5 py-10 text-center sm:px-8">
            <h1 className="font-editorial text-2xl font-bold text-public-text">
              News and insights
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-public-muted-text sm:text-base">
              No published news is currently available.
            </p>
          </PublicCard>
        </PublicContainer>
      )}
      <HomeUpcomingEvents events={upcomingEvents} />
      {latestMagazine ? (
        <HomeLatestMagazine magazine={latestMagazine} />
      ) : null}
    </main>
  );
}
