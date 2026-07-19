import { ArrowRight, BookOpen, CalendarDays, Compass, Home, Newspaper } from "lucide-react";
import Link from "next/link";

import { comingSoonHref } from "@/config/coming-soon";

const destinations = [
  { label: "Latest News", description: "Read the latest updates and articles.", href: "/news", icon: Newspaper },
  { label: "Events", description: "Discover upcoming events and gatherings.", href: "/events", icon: CalendarDays },
  { label: "Magazine", description: "Explore the latest issues and stories.", href: "/magazine", icon: BookOpen },
  { label: "Resources", description: "Browse material for deeper learning.", href: comingSoonHref("resources"), icon: Compass },
];

export function PublicNotFound() {
  return (
    <main className="flex-1 bg-public-background">
      <section className="mx-auto w-full max-w-[1280px] px-4 py-14 text-center sm:px-6 sm:py-18 lg:px-8 lg:py-20">
        <p className="font-editorial text-7xl font-bold leading-none text-public-text sm:text-8xl">404</p>
        <h1 className="mt-4 font-editorial text-3xl font-bold text-public-text sm:text-4xl">Oops! Page not found.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-public-muted-text sm:text-base">
          The page you’re looking for doesn’t exist or has been moved. Let&apos;s get you back on track.
        </p>

        <div aria-hidden="true" className="mx-auto mt-8 flex aspect-[16/7] max-w-xl items-center justify-center overflow-hidden rounded-[42%] bg-gradient-to-b from-public-primary-soft to-public-surface px-8">
          <div className="relative flex size-36 items-center justify-center rounded-full border border-public-primary/20 bg-public-surface shadow-[var(--public-shadow)] sm:size-44">
            <Compass className="size-16 text-public-primary sm:size-20" strokeWidth={1.4} />
            <span className="absolute -bottom-3 rounded-full bg-public-primary px-3 py-1 text-xs font-bold text-white">Truth</span>
          </div>
        </div>

        <Link href="/" className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--public-radius)] bg-public-primary px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-public-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary">
          <Home className="size-4" aria-hidden="true" />
          Back to Homepage
        </Link>

        <p className="mt-7 text-sm text-public-muted-text">Or explore something helpful:</p>
        <div className="mx-auto mt-4 grid max-w-6xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map(({ label, description, href, icon: Icon }) => (
            <Link key={label} href={href} className="group rounded-[var(--public-radius)] border border-public-border bg-public-surface p-4 shadow-[var(--public-shadow)] transition-colors hover:border-public-primary/35 hover:bg-public-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary">
              <span className="flex items-center justify-between gap-3 font-bold text-public-text"><span className="flex items-center gap-2"><Icon className="size-5 text-public-primary" aria-hidden="true" />{label}</span><ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
              <span className="mt-3 block text-sm leading-5 text-public-muted-text">{description}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
