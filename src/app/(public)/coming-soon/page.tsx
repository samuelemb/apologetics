import type { Metadata } from "next";
import Image from "next/image";
import {
  Bell,
  BookOpenText,
  House,
  Mail,
  Mic2,
  Video,
} from "lucide-react";
import Link from "next/link";

import {
  COMING_SOON_FEATURES,
  comingSoonHref,
} from "@/config/coming-soon";
import { comingSoonQuerySchema } from "@/schemas/coming-soon";

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = {
  title: "Coming Soon | APOLOGETICS መፅሔት",
  description: "This APOLOGETICS feature is being prepared.",
};

const genericCopy = {
  title: "Something special is on the way",
  message:
    "We are preparing this part of APOLOGETICS and will make it available when it is ready.",
};

const upcomingFeatures = [
  {
    title: "Resources",
    description: "Curated references and learning materials for deeper study.",
    icon: BookOpenText,
  },
  {
    title: "Videos",
    description: "Talks, interviews, and thoughtful educational conversations.",
    icon: Video,
  },
  {
    title: "Speakers",
    description: "Profiles and contributions from trusted community voices.",
    icon: Mic2,
  },
] as const;

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsedQuery = comingSoonQuerySchema.safeParse(await searchParams);
  const feature = parsedQuery.success ? parsedQuery.data.feature : undefined;
  const copy = feature ? COMING_SOON_FEATURES[feature] : genericCopy;

  return (
    <main className="flex flex-1 flex-col bg-white">
      <section className="overflow-hidden px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b20d19] sm:text-sm">
              We are preparing something special
            </p>
            <h1 className="mt-4 font-serif text-5xl font-semibold leading-none text-[#111827] sm:text-6xl lg:text-7xl">
              Coming Soon
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#526078] sm:text-lg">
              The next chapter of <strong className="font-semibold text-[#273247]">APOLOGETICS መፅሔት</strong> is on its way.
            </p>
            <p className="mt-3 text-base font-semibold text-[#111827]">
              {copy.title}
            </p>
            <p className="mx-auto mt-1 max-w-2xl text-sm leading-6 text-[#68758a] sm:text-base">
              {copy.message}
            </p>
          </div>

          <div
            className="relative mx-auto mt-5 h-36 w-full max-w-5xl overflow-hidden sm:h-44 lg:h-52"
            aria-hidden="true"
          >
            <Image
              src="/images/coming-soon-reference.png"
              alt=""
              width={1600}
              height={1200}
              priority
              className="absolute left-1/2 top-[-218px] w-[900px] max-w-none -translate-x-1/2 sm:top-[-281px] sm:w-[1150px] lg:top-[-345px] lg:w-[1400px]"
            />
          </div>

          <div className="mx-auto mt-3 grid max-w-4xl gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center text-[#b20d19]" aria-hidden="true">
                <Mail className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#202b3d]">
                  Launch notifications are coming soon
                </p>
                <p className="mt-1 text-xs leading-5 text-[#68758a] sm:text-sm">
                  We will make email updates available as soon as they are ready.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 sm:justify-end">
              <Link
                href={comingSoonHref("subscribe")}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#b20d19] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#8f0a14] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#b20d19] sm:flex-none sm:px-5"
              >
                <Bell className="size-4" />
                Notify Me
              </Link>
              <Link
                href="/"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[#b20d19] px-3 text-sm font-semibold text-[#b20d19] transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#b20d19] sm:flex-none sm:px-5"
              >
                <House className="size-4" />
                Back to Home
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-3">
            {upcomingFeatures.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="grid min-h-36 grid-cols-[4.5rem_1fr] items-center gap-4 rounded-md border border-neutral-200 bg-white p-5"
              >
                <span className="flex size-16 items-center justify-center rounded-md bg-red-50 text-[#b20d19]" aria-hidden="true">
                  <Icon className="size-8" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <h2 className="font-serif text-xl font-semibold text-[#111827]">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-[#5f6b7d]">
                    {description}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#b20d19]">
                    Coming Soon
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
