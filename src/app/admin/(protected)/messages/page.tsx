import {
  Archive,
  Eye,
  Mail,
  MailOpen,
  MailWarning,
  Send,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminSearchField,
  AdminStatCard,
  AdminStatusBadge,
  AdminTableCard,
  adminControlClass,
  adminTableCellClass,
  adminTableHeaderCellClass,
  formatAdminLabel,
} from "@/components/admin/admin-listing";
import { AdminAvatar } from "@/components/admin/admin-listing-media";
import { ContactMessageActions } from "@/components/admin/contact-message-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ContactMessageStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/guards";
import {
  canAccessContactMessageAdmin,
  canDeleteContactMessage,
} from "@/lib/contact-message-policy";
import { cn } from "@/lib/utils";
import {
  contactMessageQuerySchema,
  type ContactMessageQuery,
} from "@/schemas/contact-message";
import { listContactMessages } from "@/services/contact-message.service";

type SearchParams = Record<string, string | string[] | undefined>;

function buildPageHref(query: ContactMessageQuery, page: number): string {
  const params = new URLSearchParams({ page: String(page), sort: query.sort });
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return `/admin/messages?${params.toString()}`;
}

function formatDateTime(value: Date | null): string {
  return value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "Not yet";
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireAdmin();
  if (!canAccessContactMessageAdmin(actor.role)) {
    redirect("/admin?error=forbidden");
  }

  const rawSearchParams = await searchParams;
  const parsedQuery = contactMessageQuerySchema.safeParse(rawSearchParams);
  const query = parsedQuery.success
    ? parsedQuery.data
    : contactMessageQuerySchema.parse({});
  const listing = await listContactMessages(
    { id: actor.id, role: actor.role },
    query,
  );
  const hasFilters = Boolean(
    query.search || query.status || query.from || query.to || query.sort !== "newest",
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <AdminPageHeader
        title="Contact Messages"
        description="Review private inquiries and track their administrative status."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Contact message summary">
        <AdminStatCard label="Total messages" value={listing.summary.total} description="All inquiries" icon={Mail} tone="primary" />
        <AdminStatCard label="New messages" value={listing.summary.new} description="Awaiting review" icon={MailWarning} tone="warning" />
        <AdminStatCard label="Read messages" value={listing.summary.read} description="Reviewed inquiries" icon={MailOpen} tone="info" />
        <AdminStatCard label="Replied messages" value={listing.summary.replied} description="Externally replied" icon={Send} tone="success" />
        <AdminStatCard label="Archived messages" value={listing.summary.archived} description="Archived inquiries" icon={Archive} tone="info" />
        <AdminStatCard label="Spam messages" value={listing.summary.spam} description="Marked as spam" icon={ShieldAlert} tone="warning" />
      </section>

      <AdminFilterBar>
        <AdminSearchField
          name="search"
          defaultValue={query.search}
          placeholder="Search messages..."
          label="Search contact messages"
          className="lg:min-w-72"
        />
        <Select name="status" defaultValue={query.status ?? ""} aria-label="Filter contact messages by status" className={adminControlClass}>
          <option value="">All statuses</option>
          {Object.values(ContactMessageStatus).map((status) => (
            <option key={status} value={status}>{formatAdminLabel(status)}</option>
          ))}
        </Select>
        <Input type="date" name="from" defaultValue={query.from} aria-label="Received from date" className={adminControlClass} />
        <Input type="date" name="to" defaultValue={query.to} aria-label="Received through date" className={adminControlClass} />
        <Select name="sort" defaultValue={query.sort} aria-label="Sort contact messages" className={adminControlClass}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="alphabetical">Sender A-Z</option>
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
          !listing.messages.length ? (
            <AdminEmptyState
              title="No contact messages found"
              description="No contact messages match the selected filters."
              resetHref={hasFilters ? "/admin/messages" : undefined}
            />
          ) : undefined
        }
        footer={
          listing.messages.length ? (
            <AdminPagination
              summary={`${listing.filteredTotal} result${listing.filteredTotal === 1 ? "" : "s"}`}
              page={listing.page}
              totalPages={listing.totalPages}
              previousHref={listing.page > 1 ? buildPageHref(query, listing.page - 1) : undefined}
              nextHref={listing.page < listing.totalPages ? buildPageHref(query, listing.page + 1) : undefined}
            />
          ) : undefined
        }
      >
        {listing.messages.length ? (
          <table className="w-full min-w-[1480px] text-left">
            <thead className="border-b border-admin-border bg-admin-background/80">
              <tr>
                <th scope="col" className={adminTableHeaderCellClass}>Sender</th>
                <th scope="col" className={adminTableHeaderCellClass}>Email</th>
                <th scope="col" className={adminTableHeaderCellClass}>Subject</th>
                <th scope="col" className={adminTableHeaderCellClass}>Status</th>
                <th scope="col" className={adminTableHeaderCellClass}>Phone</th>
                <th scope="col" className={adminTableHeaderCellClass}>Received</th>
                <th scope="col" className={adminTableHeaderCellClass}>Read</th>
                <th scope="col" className={adminTableHeaderCellClass}>Replied</th>
                <th scope="col" className={adminTableHeaderCellClass}>Updated</th>
                <th scope="col" className={cn(adminTableHeaderCellClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {listing.messages.map((message) => (
                <tr key={message.id} className="transition-colors hover:bg-admin-background/70">
                  <td className={adminTableCellClass}>
                    <div className="flex min-w-48 items-center gap-3">
                      <AdminAvatar name={message.name} />
                      <span className="font-semibold">{message.name}</span>
                    </div>
                  </td>
                  <td className={cn(adminTableCellClass, "text-admin-muted-text")}>{message.email}</td>
                  <td className={cn(adminTableCellClass, "max-w-72")}><span className="line-clamp-2">{message.subject || "(No subject)"}</span></td>
                  <td className={adminTableCellClass}><AdminStatusBadge status={message.status} /></td>
                  <td className={cn(adminTableCellClass, "text-admin-muted-text")}>{message.hasPhone ? "Available" : "None"}</td>
                  <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDateTime(message.createdAt)}</td>
                  <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDateTime(message.readAt)}</td>
                  <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDateTime(message.repliedAt)}</td>
                  <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDateTime(message.updatedAt)}</td>
                  <td className={adminTableCellClass}>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/admin/messages/${message.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 rounded-md")}>
                        <Eye aria-hidden="true" />
                        View
                      </Link>
                      <ContactMessageActions
                        id={message.id}
                        status={message.status}
                        deleteConfirmation={
                          canDeleteContactMessage(actor.role, message.status)
                            ? { name: message.name, email: message.email, subject: message.subject }
                            : undefined
                        }
                        compact
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : undefined}
      </AdminTableCard>
    </div>
  );
}
