"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  publicActionNavigation,
  publicPrimaryNavigation,
} from "@/config/public-navigation";
import { cn } from "@/lib/utils";

function NavigationLink({
  href,
  label,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const route = href.split("?")[0];
  const active =
    route !== "/coming-soon" &&
    (pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)));

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center border-b-2 border-transparent px-1 text-sm font-medium text-neutral-700 transition-colors hover:text-[#a3162d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a3162d]",
        active && "border-[#a3162d] text-[#a3162d]",
      )}
    >
      {label}
    </Link>
  );
}

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="relative z-40 border-b border-neutral-200 bg-white">
      <div className="h-1 bg-[#a3162d]" />
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a3162d]"
          aria-label="APOLOGETICS መፅሔት home"
        >
          <span className="flex size-9 items-center justify-center bg-[#a3162d] text-lg font-bold text-white">
            A
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-bold text-neutral-950 sm:text-base">
              APOLOGETICS
            </span>
            <span className="block text-xs font-medium text-[#a3162d]">መፅሔት</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-stretch gap-5 self-stretch lg:flex" aria-label="Primary navigation">
          {publicPrimaryNavigation.map((item) => (
            <NavigationLink key={item.label} {...item} pathname={pathname} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href={publicActionNavigation.search.href}
            className="inline-flex size-9 items-center justify-center text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-[#a3162d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3162d]"
            aria-label="Search"
            title="Search"
          >
            <Search className="size-5" />
          </Link>
          <Link
            href={publicActionNavigation.donate.href}
            className="hidden h-9 items-center bg-[#a3162d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#821124] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3162d] sm:inline-flex"
          >
            Donate
          </Link>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3162d] lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full border-t border-neutral-200 bg-white shadow-lg lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:px-6" aria-label="Mobile navigation">
            {publicPrimaryNavigation.map((item) => (
              <NavigationLink
                key={item.label}
                {...item}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
            <Link
              href={publicActionNavigation.donate.href}
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex h-10 items-center justify-center bg-[#a3162d] px-4 text-sm font-semibold text-white"
            >
              Donate
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
