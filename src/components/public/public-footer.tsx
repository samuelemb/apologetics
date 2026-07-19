import { MailPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  publicActionNavigation,
  publicFooterNavigation,
} from "@/config/public-navigation";

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div className="min-w-0">
      <h2 className="font-editorial text-xs font-bold uppercase tracking-[0.08em] text-public-text">
        {title}
      </h2>
      <ul className="mt-2.5 space-y-0.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="inline-flex min-h-8 max-w-full items-center break-words text-xs leading-5 text-public-muted-text transition-colors hover:text-public-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t-2 border-public-primary bg-public-surface">
      <div className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-7 sm:grid-cols-2 sm:px-6 sm:py-8 lg:grid-cols-[1.45fr_0.85fr_0.95fr_0.8fr] lg:gap-7 lg:px-8">
        <div className="max-w-md sm:col-span-2 lg:col-span-1">
          <Link
            href="/"
            aria-label="APOLOGETICS መፅሔት home"
            className="inline-flex max-w-full items-center gap-3 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-public-primary"
          >
            <Image
              src="/images/apologetics-logo.png"
              alt="APOLOGETICS መፅሔት logo"
              width={68}
              height={68}
              className="size-12 shrink-0 rounded-full object-contain sm:size-14"
            />
            <span className="min-w-0 leading-tight">
              <span className="block font-editorial text-sm font-bold text-public-primary sm:text-base">
                APOLOGETICS <span className="whitespace-nowrap">መፅሔት</span>
              </span>
              <span className="mt-1 block text-xs font-medium tracking-wide text-public-muted-text">
                Truth. Knowledge. Dawah.
              </span>
            </span>
          </Link>
          <p className="mt-3 max-w-sm text-xs leading-5 text-public-muted-text">
            Islamic news, events, and publishing for thoughtful learning and community engagement.
          </p>
          <Link
            href={publicActionNavigation.subscribe.href}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-[var(--public-radius)] bg-public-primary px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-public-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"
          >
            <MailPlus className="size-4" aria-hidden="true" />
            Subscribe
          </Link>
        </div>

        <FooterLinks title="Explore" links={publicFooterNavigation.explore} />
        <FooterLinks title="Community" links={publicFooterNavigation.community} />
        <FooterLinks title="Legal" links={publicFooterNavigation.legal} />
      </div>

      <div className="bg-public-primary text-white">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-3 text-center text-xs sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} APOLOGETICS መፅሔት. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
