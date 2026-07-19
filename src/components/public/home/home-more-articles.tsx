import { Newspaper } from "lucide-react";
import Link from "next/link";

import { PublicContainer } from "@/components/public/public-container";

export function HomeMoreArticles() {
  return (
    <section aria-label="More articles" className="pb-6 sm:pb-8">
      <PublicContainer>
        <Link
          href="/news"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--public-radius)] bg-public-primary px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition-colors hover:bg-public-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary sm:text-base"
        >
          <Newspaper aria-hidden="true" className="size-5 shrink-0" />
          <span className="break-words">View More Articles</span>
        </Link>
      </PublicContainer>
    </section>
  );
}
