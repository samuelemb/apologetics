import { MailPlus } from "lucide-react";
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
    <div>
      <h2 className="text-sm font-semibold text-neutral-950">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-neutral-600 transition-colors hover:text-[#a3162d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3162d]"
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
    <footer className="border-t-4 border-[#a3162d] bg-neutral-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a3162d]"
          >
            <span className="flex size-10 items-center justify-center bg-[#a3162d] text-lg font-bold text-white">A</span>
            <span>
              <span className="block font-bold text-neutral-950">APOLOGETICS</span>
              <span className="block text-sm font-medium text-[#a3162d]">መፅሔት</span>
            </span>
          </Link>
          <p className="mt-5 text-sm leading-6 text-neutral-600">
            Islamic news, events, and publishing for thoughtful learning and community engagement.
          </p>
          <Link
            href={publicActionNavigation.subscribe.href}
            className="mt-6 inline-flex h-10 items-center gap-2 bg-[#a3162d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#821124] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3162d]"
          >
            <MailPlus className="size-4" />
            Subscribe
          </Link>
        </div>

        <FooterLinks title="Explore" links={publicFooterNavigation.explore} />
        <FooterLinks title="Community" links={publicFooterNavigation.community} />
        <FooterLinks title="Legal" links={publicFooterNavigation.legal} />
      </div>

      <div className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} APOLOGETICS መፅሔት. All rights reserved.</p>
          <p>Islamic news and publishing platform.</p>
        </div>
      </div>
    </footer>
  );
}
