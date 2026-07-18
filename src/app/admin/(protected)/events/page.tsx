import { Edit3, Plus } from "lucide-react";
import Link from "next/link";

import {
  AdminBadge,
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminSearchField,
  AdminStatusBadge,
  AdminTableCard,
  adminControlClass,
  adminPrimaryActionClass,
  adminTableCellClass,
  adminTableHeaderCellClass,
} from "@/components/admin/admin-listing";
import { AdminThumbnail } from "@/components/admin/admin-listing-media";
import { DeleteEventButton } from "@/components/admin/delete-event-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EventStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/guards";
import {
  canCreateEvent,
  canDeleteEvent,
  canEditEvent,
} from "@/lib/event-policy";
import { cn } from "@/lib/utils";
import { eventQuerySchema, type EventQuery } from "@/schemas/event";
import { getEventFormOptions, listEvents } from "@/services/event.service";

type SearchParams = Record<string, string | string[] | undefined>;

function buildPageHref(query: EventQuery, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.category) params.set("category", query.category);
  if (query.mode) params.set("mode", query.mode);
  params.set("sort", query.sort);
  return `/admin/events?${params.toString()}`;
}

function formatDateTime(value: Date | null): string {
  if (!value) return "--";

  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value)} UTC`;
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireAdmin();
  const rawSearchParams = await searchParams;
  const parsedQuery = eventQuerySchema.safeParse(rawSearchParams);
  const query = parsedQuery.success
    ? parsedQuery.data
    : eventQuerySchema.parse({});
  const [listing, options] = await Promise.all([
    listEvents(query),
    getEventFormOptions(),
  ]);
  const hasFilters = Boolean(
    query.search || query.status || query.category || query.mode || query.sort !== "newest",
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <AdminPageHeader
        title="Events"
        description={`Manage and organize ${listing.total} event${listing.total === 1 ? "" : "s"}.`}
        actions={
          canCreateEvent(user.role) ? (
            <Link href="/admin/events/new" className={adminPrimaryActionClass}>
              <Plus aria-hidden="true" />
              New event
            </Link>
          ) : undefined
        }
      />

      <AdminFilterBar>
        <AdminSearchField
          name="search"
          defaultValue={query.search}
          placeholder="Search events..."
          label="Search events by title"
          className="lg:min-w-64"
        />
        <Select name="status" defaultValue={query.status ?? ""} aria-label="Filter by status" className={adminControlClass}>
          <option value="">All statuses</option>
          {Object.values(EventStatus).map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
        <Select name="category" defaultValue={query.category ?? ""} aria-label="Filter by category" className={adminControlClass}>
          <option value="">All categories</option>
          {options.categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </Select>
        <Select name="mode" defaultValue={query.mode ?? ""} aria-label="Filter by attendance mode" className={adminControlClass}>
          <option value="">All modes</option>
          <option value="online">Online</option>
          <option value="physical">Physical</option>
        </Select>
        <Select name="sort" defaultValue={query.sort} aria-label="Sort events" className={adminControlClass}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="start">Start date</option>
        </Select>
        <Button type="submit" variant="outline" size="lg" className="h-[var(--admin-control-height)] rounded-[var(--admin-radius)] px-5">
          Apply filters
        </Button>
      </AdminFilterBar>

      {!parsedQuery.success ? (
        <p className="text-sm font-medium text-admin-danger" role="alert">Invalid filters were ignored.</p>
      ) : null}

      <AdminTableCard
        emptyState={
          !listing.events.length ? (
            <AdminEmptyState
              title="No events found"
              description="No events match the selected filters."
              resetHref={hasFilters ? "/admin/events" : undefined}
            />
          ) : undefined
        }
        footer={
          listing.events.length ? (
            <AdminPagination
              summary={`${listing.total} event${listing.total === 1 ? "" : "s"}`}
              page={listing.page}
              totalPages={listing.totalPages}
              previousHref={listing.page > 1 ? buildPageHref(query, listing.page - 1) : undefined}
              nextHref={listing.page < listing.totalPages ? buildPageHref(query, listing.page + 1) : undefined}
            />
          ) : undefined
        }
      >
        {listing.events.length ? (
          <table className="w-full min-w-[1320px] text-left">
            <thead className="border-b border-admin-border bg-admin-background/80">
              <tr>
                <th scope="col" className={adminTableHeaderCellClass}>Title</th>
                <th scope="col" className={adminTableHeaderCellClass}>Category</th>
                <th scope="col" className={adminTableHeaderCellClass}>Author</th>
                <th scope="col" className={adminTableHeaderCellClass}>Status</th>
                <th scope="col" className={adminTableHeaderCellClass}>Start</th>
                <th scope="col" className={adminTableHeaderCellClass}>End</th>
                <th scope="col" className={adminTableHeaderCellClass}>Location</th>
                <th scope="col" className={adminTableHeaderCellClass}>Featured</th>
                <th scope="col" className={adminTableHeaderCellClass}>Published</th>
                <th scope="col" className={adminTableHeaderCellClass}>Updated</th>
                <th scope="col" className={cn(adminTableHeaderCellClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {listing.events.map((event) => {
                const editable = canEditEvent(user.role, user.id, event.authorId);

                return (
                  <tr key={event.id} className="transition-colors hover:bg-admin-background/70">
                    <td className={cn(adminTableCellClass, "max-w-sm")}>
                      <div className="flex items-center gap-3">
                        <AdminThumbnail alt="Event placeholder" kind="event" />
                        <span className="line-clamp-2 font-semibold">{event.title}</span>
                      </div>
                    </td>
                    <td className={adminTableCellClass}>
                      {event.category?.name ? <AdminBadge label={event.category.name} tone="primary" /> : <span className="text-admin-muted-text">--</span>}
                    </td>
                    <td className={cn(adminTableCellClass, "text-admin-muted-text")}>{event.author?.name ?? "--"}</td>
                    <td className={adminTableCellClass}><AdminStatusBadge status={event.status} /></td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDateTime(event.startAt)}</td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDateTime(event.endAt)}</td>
                    <td className={cn(adminTableCellClass, "max-w-52 text-admin-muted-text")}>{event.isOnline ? "Online" : (event.location ?? "--")}</td>
                    <td className={adminTableCellClass}><AdminBadge label={event.featured ? "Yes" : "No"} tone={event.featured ? "info" : "neutral"} /></td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDateTime(event.publishedAt)}</td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDateTime(event.updatedAt)}</td>
                    <td className={adminTableCellClass}>
                      <div className="flex justify-end gap-2">
                        {editable ? (
                          <Link href={`/admin/events/${event.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 rounded-md")}>
                            <Edit3 aria-hidden="true" />
                            Edit
                          </Link>
                        ) : null}
                        {canDeleteEvent(user.role) ? <DeleteEventButton id={event.id} title={event.title} /> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : undefined}
      </AdminTableCard>
    </div>
  );
}
