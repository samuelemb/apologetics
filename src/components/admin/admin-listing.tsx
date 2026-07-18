import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
} from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const adminControlClass =
  "h-[var(--admin-control-height)] w-full rounded-[var(--admin-radius)] border-admin-border bg-admin-surface px-3 text-sm text-admin-text shadow-none outline-none transition focus-visible:border-admin-primary focus-visible:ring-2 focus-visible:ring-admin-primary/15 2xl:w-44 2xl:flex-none";

export const adminPrimaryActionClass = cn(
  buttonVariants({ size: "lg" }),
  "h-[var(--admin-control-height)] rounded-[var(--admin-radius)] bg-admin-primary px-4 text-white shadow-sm hover:bg-admin-primary-hover focus-visible:ring-admin-primary/25",
);

export const adminTableHeaderCellClass =
  "h-12 whitespace-nowrap px-4 text-left text-xs font-semibold uppercase tracking-wide text-admin-muted-text";

export const adminTableCellClass =
  "px-4 py-3 align-middle text-sm text-admin-text";

type AdminPageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function AdminPageHeader({
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-admin-text sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-admin-muted-text">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

export function AdminFilterBar({
  className,
  children,
  ...props
}: ComponentProps<"form">) {
  return (
    <form
      className={cn(
        "flex flex-col gap-3 rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface p-4 shadow-[var(--admin-shadow)] [&>button]:w-full lg:grid lg:grid-cols-2 lg:items-end xl:grid-cols-3 2xl:flex 2xl:flex-row 2xl:flex-nowrap 2xl:[&>button]:w-auto",
        className,
      )}
      {...props}
    >
      {children}
    </form>
  );
}

type AdminSearchFieldProps = Omit<ComponentProps<typeof Input>, "type"> & {
  label: string;
};

export function AdminSearchField({
  label,
  className,
  ...props
}: AdminSearchFieldProps) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-admin-muted-text"
      />
      <Input
        type="search"
        className={cn(adminControlClass, "w-full pl-10 lg:w-full lg:flex-auto", className)}
        {...props}
      />
    </label>
  );
}

type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "danger";

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: "bg-admin-background text-admin-muted-text",
  primary: "bg-admin-primary-soft text-admin-primary",
  success: "bg-emerald-50 text-admin-success",
  warning: "bg-orange-50 text-admin-warning",
  info: "bg-blue-50 text-admin-info",
  danger: "bg-red-50 text-admin-danger",
};

export function formatAdminLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminBadge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        badgeToneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

function getStatusTone(status: string): BadgeTone {
  switch (status) {
    case "PUBLISHED":
    case "ACTIVE":
    case "REPLIED":
      return "success";
    case "SCHEDULED":
    case "READ":
      return "info";
    case "DRAFT":
    case "INVITED":
    case "NEW":
      return "warning";
    case "CANCELLED":
    case "SPAM":
      return "danger";
    default:
      return "neutral";
  }
}

export function AdminStatusBadge({ status }: { status: string }) {
  return <AdminBadge label={formatAdminLabel(status)} tone={getStatusTone(status)} />;
}

export function AdminRoleBadge({ role }: { role: string }) {
  const tone: BadgeTone =
    role === "SUPER_ADMIN" || role === "ADMIN"
      ? "primary"
      : role === "EDITOR"
        ? "info"
        : "success";

  return <AdminBadge label={formatAdminLabel(role)} tone={tone} />;
}

type StatTone = "primary" | "success" | "warning" | "info";

const statToneClasses: Record<StatTone, string> = {
  primary: "bg-admin-primary-soft text-admin-primary",
  success: "bg-emerald-50 text-admin-success",
  warning: "bg-orange-50 text-admin-warning",
  info: "bg-blue-50 text-admin-info",
};

export function AdminStatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone?: StatTone;
}) {
  return (
    <div className="flex min-h-28 items-center gap-4 rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface p-4 shadow-[var(--admin-shadow)]">
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full",
          statToneClasses[tone],
        )}
      >
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-admin-muted-text">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-admin-text">{value}</p>
        <p className="mt-1 truncate text-xs text-admin-muted-text">{description}</p>
      </div>
    </div>
  );
}

export function AdminTableCard({
  children,
  emptyState,
  footer,
  className,
}: {
  children?: ReactNode;
  emptyState?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface shadow-[var(--admin-shadow)]",
        className,
      )}
    >
      {children ? <div className="overflow-x-auto">{children}</div> : null}
      {emptyState}
      {footer ? (
        <div className="border-t border-admin-border px-4 py-3">{footer}</div>
      ) : null}
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
  resetHref,
}: {
  title: string;
  description: string;
  resetHref?: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-admin-primary-soft text-admin-primary">
        <Inbox aria-hidden="true" className="size-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-admin-text">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-admin-muted-text">{description}</p>
      {resetHref ? (
        <Link
          href={resetHref}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-5")}
        >
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}

export function AdminPagination({
  summary,
  page,
  totalPages,
  previousHref,
  nextHref,
}: {
  summary: ReactNode;
  page: number;
  totalPages: number;
  previousHref?: string;
  nextHref?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-admin-muted-text">{summary}</p>
      <nav aria-label="Pagination" className="flex items-center gap-2">
        {previousHref ? (
          <Link
            href={previousHref}
            aria-label="Go to previous page"
            title="Previous page"
            className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "size-10")}
          >
            <ChevronLeft aria-hidden="true" />
          </Link>
        ) : (
          <Button
            variant="outline"
            size="icon-lg"
            className="size-10"
            aria-label="Previous page unavailable"
            disabled
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
        )}
        <span className="min-w-20 text-center text-sm font-medium text-admin-text">
          {page} of {totalPages}
        </span>
        {nextHref ? (
          <Link
            href={nextHref}
            aria-label="Go to next page"
            title="Next page"
            className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "size-10")}
          >
            <ChevronRight aria-hidden="true" />
          </Link>
        ) : (
          <Button
            variant="outline"
            size="icon-lg"
            className="size-10"
            aria-label="Next page unavailable"
            disabled
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        )}
      </nav>
    </div>
  );
}
