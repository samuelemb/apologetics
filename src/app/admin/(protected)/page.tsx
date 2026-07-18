import {
  ArrowUpRight,
  CalendarDays,
  FilePlus2,
  FileText,
  Mail,
  Newspaper,
  Plus,
  Send,
  Settings,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth/guards";
import {
  canAccessAdminSection,
  type AdminSection,
} from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { getDashboardCounts } from "@/services/dashboard.service";

type QuickAction = {
  label: string;
  href: string;
  icon: typeof Plus;
  section?: AdminSection;
  external?: boolean;
};

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  const counts = await getDashboardCounts();
  const statistics = [
    {
      label: "Total News",
      value: counts.newsArticles,
      icon: Newspaper,
      color: "bg-admin-primary-soft text-admin-primary",
    },
    {
      label: "Total Events",
      value: counts.events,
      icon: CalendarDays,
      color: "bg-admin-warning/10 text-admin-warning",
    },
    {
      label: "Magazine Issues",
      value: counts.magazineIssues,
      icon: FileText,
      color: "bg-admin-info/10 text-admin-info",
    },
    {
      label: "Contact Messages",
      value: counts.contactMessages,
      icon: Mail,
      color: "bg-admin-success/10 text-admin-success",
    },
  ];
  const contentSummary = [
    {
      label: "All content",
      value: counts.newsArticles + counts.events + counts.magazineIssues,
      icon: FileText,
    },
    { label: "Published content", value: counts.publishedContent, icon: Send },
    { label: "Draft content", value: counts.draftContent, icon: FilePlus2 },
    { label: "Subscribers", value: counts.subscribers, icon: UserRoundCheck },
  ];
  const quickActions: QuickAction[] = [
    { label: "Add News", href: "/admin/news/new", icon: Newspaper, section: "news" },
    { label: "Add Event", href: "/admin/events/new", icon: CalendarDays, section: "events" },
    { label: "Add Magazine", href: "/admin/magazine/new", icon: FileText, section: "magazine" },
    { label: "View Website", href: "/", icon: ArrowUpRight, external: true },
    { label: "Subscribers", href: "/admin/subscribers", icon: UserRoundCheck, section: "subscribers" },
    { label: "Settings", href: "/admin/settings", icon: Settings, section: "settings" },
  ];
  const visibleQuickActions = quickActions.filter(
    (action) =>
      !action.section || canAccessAdminSection(user.role, action.section),
  );

  return (
    <div className="mx-auto max-w-[92rem] space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-admin-text sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-admin-muted-text">
          Welcome back, {user.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statistics.map((statistic) => {
          const Icon = statistic.icon;

          return (
            <section
              key={statistic.label}
              className="rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface p-5 shadow-[var(--admin-shadow)]"
              aria-label={`${statistic.label}: ${statistic.value}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-full",
                    statistic.color,
                  )}
                >
                  <Icon className="size-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-admin-muted-text">
                    {statistic.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-admin-text">
                    {statistic.value.toLocaleString()}
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <section className="overflow-hidden rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface shadow-[var(--admin-shadow)]">
          <div className="border-b border-admin-border px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-admin-text">
              Content Summary
            </h2>
            <p className="mt-1 text-sm text-admin-muted-text">
              Current totals from the publishing database.
            </p>
          </div>
          <div className="divide-y divide-admin-border">
            {contentSummary.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--admin-radius)] bg-admin-background text-admin-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <span className="truncate text-sm font-medium text-admin-text">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-base font-semibold tabular-nums text-admin-text">
                    {item.value.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface p-5 shadow-[var(--admin-shadow)] sm:p-6">
          <h2 className="text-base font-semibold text-admin-text">
            Quick Actions
          </h2>
          <nav
            className="mt-4 grid grid-cols-2 gap-3"
            aria-label="Dashboard quick actions"
          >
            {visibleQuickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface px-3 py-4 text-center text-sm font-semibold text-admin-text transition-colors hover:border-admin-primary/40 hover:bg-admin-primary-soft hover:text-admin-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary focus-visible:ring-offset-2"
                  aria-label={action.external ? `${action.label}, public site` : action.label}
                >
                  <Icon className="size-6 text-admin-primary" aria-hidden="true" />
                  <span>{action.label}</span>
                </Link>
              );
            })}
          </nav>
        </section>
      </div>
    </div>
  );
}
