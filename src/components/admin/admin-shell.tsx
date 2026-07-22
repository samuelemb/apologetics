"use client";

import {
  BarChart3,
  CalendarDays,
  ExternalLink,
  FileText,
  FolderTree,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Menu,
  Newspaper,
  Settings,
  Tags,
  Users,
  UserRoundCheck,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LogoutButton } from "@/components/admin/logout-button";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/generated/prisma/enums";
import {
  canAccessAdminSection,
  type AdminSection,
} from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  section: AdminSection;
};

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        section: "dashboard",
      },
    ],
  },
  {
    label: "Content Management",
    items: [
      { label: "News", href: "/admin/news", icon: Newspaper, section: "news" },
      { label: "Events", href: "/admin/events", icon: CalendarDays, section: "events" },
      { label: "Magazine", href: "/admin/magazine", icon: FileText, section: "magazine" },
      { label: "Categories", href: "/admin/categories", icon: FolderTree, section: "categories" },
      { label: "Tags", href: "/admin/tags", icon: Tags, section: "tags" },
    ],
  },
  {
    label: "User Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users, section: "users" },
    ],
  },
  {
    label: "Engagement",
    items: [
      { label: "Contact Messages", href: "/admin/messages", icon: Mail, section: "messages" },
      { label: "Comments", href: "/admin/comments", icon: MessageCircle, section: "comments" },
      { label: "Subscribers", href: "/admin/subscribers", icon: UserRoundCheck, section: "subscribers" },
    ],
  },
  {
    label: "Site Management",
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings, section: "settings" },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3, section: "analytics" },
    ],
  },
];

const navigationItems = navigationGroups.flatMap((group) => group.items);

type AdminShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    image: string | null;
    role: UserRole;
  };
};

function isRouteActive(pathname: string, href: string): boolean {
  return (
    pathname === href ||
    (href !== "/admin" && pathname.startsWith(`${href}/`))
  );
}

function formatRole(role: UserRole): string {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");

  return initials.toUpperCase() || "A";
}

function AdminBrand() {
  return (
    <Link
      href="/admin"
      className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar"
      aria-label="APOLOGETICS admin dashboard"
    >
      <Image
        src="/images/apologetics-logo.png"
        alt="APOLOGETICS logo"
        width={52}
        height={52}
        priority
        className="size-13 shrink-0 rounded-full bg-white object-cover"
      />
      <div className="min-w-0">
        <p className="truncate font-serif text-[1.05rem] font-semibold text-admin-sidebar-text">
          APOLOGETICS
        </p>
        <p className="mt-0.5 text-xs text-admin-sidebar-muted">
          Administration
        </p>
      </div>
    </Link>
  );
}

function UserAvatar({
  image,
  name,
}: {
  image: string | null;
  name: string;
}) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-admin-border bg-admin-background text-sm font-semibold text-admin-text">
      {image ? (
        // User image URLs are validated application data and may use external hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </div>
  );
}

function Navigation({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6" aria-label="Admin navigation">
      {navigationGroups.map((group) => {
        const visibleItems = group.items.filter((item) =>
          canAccessAdminSection(role, item.section),
        );

        if (visibleItems.length === 0) return null;

        return (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[0.6875rem] font-semibold uppercase text-admin-sidebar-muted">
              {group.label}
            </p>
            <div className="space-y-1">
              {visibleItems.map((item) => {
                const active = isRouteActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-[var(--admin-radius)] px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar",
                      active
                        ? "bg-admin-primary text-white shadow-sm"
                        : "text-admin-sidebar-text hover:bg-admin-sidebar-hover",
                    )}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <Icon className="size-[1.125rem]" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function ViewWebsiteLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--admin-radius)] border border-white/25 px-3 text-sm font-medium text-admin-sidebar-text transition-colors hover:bg-admin-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar"
    >
      View Website
      <ExternalLink className="size-4" aria-hidden="true" />
    </Link>
  );
}

export function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const currentPage =
    navigationItems.find((item) => isRouteActive(pathname, item.href))?.label ??
    "Administration";

  function closeMobileNavigation() {
    setMobileOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable.at(0);
      const last = focusable.at(-1);

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-admin-background font-[family-name:var(--font-geist-sans)] text-admin-text lg:flex">
      <aside className="hidden h-screen w-[var(--admin-sidebar-width)] shrink-0 flex-col bg-admin-sidebar lg:sticky lg:top-0 lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <AdminBrand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <Navigation role={user.role} />
        </div>
        <div className="border-t border-white/10 p-4">
          <ViewWebsiteLink />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close navigation"
            onClick={closeMobileNavigation}
          />
          <aside
            id="admin-mobile-navigation"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation menu"
            className="relative flex h-full w-80 max-w-[88vw] flex-col bg-admin-sidebar shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
              <AdminBrand />
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon-lg"
                className="text-admin-sidebar-text hover:bg-admin-sidebar-hover hover:text-white focus-visible:ring-white"
                onClick={closeMobileNavigation}
                aria-label="Close navigation"
              >
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">
              <Navigation role={user.role} onNavigate={closeMobileNavigation} />
            </div>
            <div className="space-y-4 border-t border-white/10 p-4">
              <ViewWebsiteLink onNavigate={closeMobileNavigation} />
              <div className="flex items-center gap-3">
                <UserAvatar image={user.image} name={user.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-admin-sidebar-text">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-admin-sidebar-muted">
                    {formatRole(user.role)}
                  </p>
                </div>
              </div>
              <LogoutButton className="w-full border-white/20 bg-transparent text-white hover:bg-admin-sidebar-hover hover:text-white" />
            </div>
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-admin-border bg-admin-surface">
          <div className="flex h-[var(--admin-header-height)] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                ref={menuButtonRef}
                type="button"
                variant="outline"
                size="icon-lg"
                className="shrink-0 border-admin-border bg-admin-surface lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
                aria-controls="admin-mobile-navigation"
              >
                <Menu />
              </Button>
              <p className="truncate text-base font-semibold text-admin-text sm:text-lg">
                {currentPage}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <UserAvatar image={user.image} name={user.name} />
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-40 truncate text-sm font-semibold text-admin-text">
                  {user.name}
                </p>
                <p className="text-xs text-admin-muted-text">
                  {formatRole(user.role)}
                </p>
              </div>
              <LogoutButton compact />
            </div>
          </div>
        </header>
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
