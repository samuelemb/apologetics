"use client";

import { CircleUserRound, LogOut, Menu, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
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
  mobile = false,
}: {
  href: string;
  label: string;
  pathname: string;
  onNavigate?: () => void;
  mobile?: boolean;
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
        "relative flex min-h-11 items-center text-sm font-semibold text-public-muted-text transition-colors hover:text-public-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-public-primary",
        mobile
          ? "rounded-[var(--public-radius)] px-3 py-2 hover:bg-public-primary-soft"
          : "px-1.5 after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-public-primary after:transition-transform",
        active &&
          (mobile
            ? "bg-public-primary-soft text-public-primary"
            : "text-public-primary after:scale-x-100"),
      )}
    >
      {label}
    </Link>
  );
}

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const isPublicUser =
    status === "authenticated" && session.user?.role === "USER";

  return (
    <header className="relative z-40 border-b border-public-border bg-public-surface shadow-[var(--public-shadow)]">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[1280px] items-center gap-3 px-4 sm:gap-5 sm:px-6 xl:h-20 xl:px-8">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2.5 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-public-primary sm:gap-3"
          aria-label="APOLOGETICS መፅሔት home"
        >
          <Image
            src="/images/apologetics-logo.png"
            alt="APOLOGETICS መፅሔት logo"
            width={72}
            height={72}
            priority
            className="size-12 shrink-0 rounded-full object-contain sm:size-14 xl:size-16"
          />
          <span className="min-w-0 leading-tight">
            <span className="block font-editorial text-[0.82rem] font-bold tracking-[0.015em] text-public-primary sm:text-lg xl:text-xl">
              APOLOGETICS <span className="whitespace-nowrap">መፅሔት</span>
            </span>
            <span className="mt-1 hidden text-xs font-medium tracking-wide text-public-muted-text sm:block xl:text-[0.8125rem]">
              Truth. Knowledge. Dawah.
            </span>
          </span>
        </Link>

        <nav
          className="ml-auto hidden h-full items-stretch gap-4 xl:flex 2xl:gap-6"
          aria-label="Primary navigation"
        >
          {publicPrimaryNavigation.map((item) => (
            <NavigationLink key={item.label} {...item} pathname={pathname} />
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 xl:ml-3">
          <Link
            href={publicActionNavigation.search.href}
            className="inline-flex size-11 items-center justify-center rounded-full border border-public-border bg-public-surface text-public-text shadow-[var(--public-shadow)] transition-colors hover:border-public-primary/30 hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"
            aria-label="Search"
            title="Search"
          >
            <Search className="size-5" aria-hidden="true" />
          </Link>
          {isPublicUser ? (
            <div className="hidden items-center gap-2 sm:flex"><Link href="/account" className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--public-radius)] border border-public-border bg-public-surface px-4 text-sm font-bold text-public-text transition-colors hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"><CircleUserRound className="size-4" aria-hidden="true" />Account</Link><button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--public-radius)] border border-public-border bg-public-surface px-4 text-sm font-bold text-public-text transition-colors hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"><LogOut className="size-4" aria-hidden="true" />Sign out</button></div>
          ) : status !== "authenticated" ? (
            <div className="hidden items-center gap-3 sm:flex">
              <Link href="/login" className="text-sm font-bold text-public-muted-text transition-colors hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary">Sign in</Link>
            </div>
          ) : null}
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-[var(--public-radius)] border border-public-border bg-public-surface text-public-text transition-colors hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary xl:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-navigation"
          >
            {mobileOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          id="public-mobile-navigation"
          className="absolute inset-x-0 top-full max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-public-border bg-public-surface shadow-lg xl:hidden"
        >
          <nav
            className="mx-auto grid w-full max-w-[1280px] gap-1 px-4 py-4 sm:px-6"
            aria-label="Mobile navigation"
          >
            {publicPrimaryNavigation.map((item) => (
              <NavigationLink
                key={item.label}
                {...item}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
                mobile
              />
            ))}
            {isPublicUser ? (
              <div className="mt-3 grid gap-2"><Link href="/account" onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--public-radius)] border border-public-border px-4 text-sm font-bold text-public-text"><CircleUserRound className="size-4" aria-hidden="true" />Account</Link><button type="button" onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/" }); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--public-radius)] border border-public-border px-4 text-sm font-bold text-public-text transition-colors hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"><LogOut className="size-4" aria-hidden="true" />Sign out</button></div>
            ) : status !== "authenticated" ? (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[var(--public-radius)] border border-public-border px-4 text-sm font-bold text-public-text sm:hidden">Sign in</Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
