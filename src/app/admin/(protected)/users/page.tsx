import {
  Edit3,
  MailPlus,
  Plus,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminRoleBadge,
  AdminSearchField,
  AdminStatCard,
  AdminStatusBadge,
  AdminTableCard,
  adminControlClass,
  adminPrimaryActionClass,
  adminTableCellClass,
  adminTableHeaderCellClass,
  formatAdminLabel,
} from "@/components/admin/admin-listing";
import { AdminAvatar } from "@/components/admin/admin-listing-media";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/guards";
import {
  canAccessUserAdmin,
  canChangeUserStatus,
  canDeleteUser,
  canEditUser,
} from "@/lib/user-policy";
import { cn } from "@/lib/utils";
import { userQuerySchema, type UserQuery } from "@/schemas/user";
import { listUsers } from "@/services/user.service";

type SearchParams = Record<string, string | string[] | undefined>;

function buildPageHref(query: UserQuery, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (query.search) params.set("search", query.search);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  params.set("sort", query.sort);
  return `/admin/users?${params.toString()}`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

function formatDateTime(value: Date | null): string {
  return value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "Never";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireAdmin();
  if (!canAccessUserAdmin(actor.role)) {
    redirect("/admin?error=forbidden");
  }

  const rawSearchParams = await searchParams;
  const parsedQuery = userQuerySchema.safeParse(rawSearchParams);
  const query = parsedQuery.success
    ? parsedQuery.data
    : userQuerySchema.parse({});
  const listing = await listUsers({ id: actor.id, role: actor.role }, query);
  const hasFilters = Boolean(
    query.search || query.role || query.status || query.sort !== "newest",
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <AdminPageHeader
        title="Users"
        description="Manage administrator access, roles, and account status."
        actions={
          <Link href="/admin/users/new" className={adminPrimaryActionClass}>
            <Plus aria-hidden="true" />
            Add user
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="User summary">
        <AdminStatCard label="Total users" value={listing.summary.total} description="All administrator accounts" icon={Users} tone="primary" />
        <AdminStatCard label="Active users" value={listing.summary.active} description="Active accounts" icon={UserCheck} tone="success" />
        <AdminStatCard label="Suspended users" value={listing.summary.suspended} description="Suspended accounts" icon={UserX} tone="warning" />
        <AdminStatCard label="Invited users" value={listing.summary.invited} description="Pending invitations" icon={MailPlus} tone="info" />
      </section>

      <AdminFilterBar>
        <AdminSearchField
          name="search"
          defaultValue={query.search}
          placeholder="Search users..."
          label="Search users by name or email"
          className="lg:min-w-72"
        />
        <Select name="role" defaultValue={query.role ?? ""} aria-label="Filter users by role" className={adminControlClass}>
          <option value="">All roles</option>
          {Object.values(UserRole).map((role) => (
            <option key={role} value={role}>{formatAdminLabel(role)}</option>
          ))}
        </Select>
        <Select name="status" defaultValue={query.status ?? ""} aria-label="Filter users by status" className={adminControlClass}>
          <option value="">All statuses</option>
          {Object.values(UserStatus).map((status) => (
            <option key={status} value={status}>{formatAdminLabel(status)}</option>
          ))}
        </Select>
        <Select name="sort" defaultValue={query.sort} aria-label="Sort users" className={adminControlClass}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="alphabetical">Alphabetical</option>
          <option value="recent-login">Most recent login</option>
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
          !listing.users.length ? (
            <AdminEmptyState
              title="No users found"
              description="No users match the selected filters."
              resetHref={hasFilters ? "/admin/users" : undefined}
            />
          ) : undefined
        }
        footer={
          listing.users.length ? (
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
        {listing.users.length ? (
          <table className="w-full min-w-[1320px] text-left">
            <thead className="border-b border-admin-border bg-admin-background/80">
              <tr>
                <th scope="col" className={adminTableHeaderCellClass}>User</th>
                <th scope="col" className={adminTableHeaderCellClass}>Email</th>
                <th scope="col" className={adminTableHeaderCellClass}>Role</th>
                <th scope="col" className={adminTableHeaderCellClass}>Status</th>
                <th scope="col" className={adminTableHeaderCellClass}>Last login</th>
                <th scope="col" className={adminTableHeaderCellClass}>Created</th>
                <th scope="col" className={adminTableHeaderCellClass}>Updated</th>
                <th scope="col" className={cn(adminTableHeaderCellClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {listing.users.map((user) => {
                const target = { id: user.id, role: user.role };
                const isLastActiveSuperAdmin =
                  listing.activeSuperAdminCount === 1 &&
                  user.role === UserRole.SUPER_ADMIN &&
                  user.status === UserStatus.ACTIVE;
                const mayEdit = canEditUser(actor, target);
                const mayChangeStatus =
                  !isLastActiveSuperAdmin && canChangeUserStatus(actor, target);
                const mayDelete =
                  !isLastActiveSuperAdmin && canDeleteUser(actor, target);

                return (
                  <tr key={user.id} className="transition-colors hover:bg-admin-background/70">
                    <td className={adminTableCellClass}>
                      <div className="flex min-w-48 items-center gap-3">
                        <AdminAvatar src={user.image} name={user.name} />
                        <span className="font-semibold">{user.name}</span>
                      </div>
                    </td>
                    <td className={cn(adminTableCellClass, "text-admin-muted-text")}>{user.email}</td>
                    <td className={adminTableCellClass}><AdminRoleBadge role={user.role} /></td>
                    <td className={adminTableCellClass}><AdminStatusBadge status={user.status} /></td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDateTime(user.lastLoginAt)}</td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDate(user.createdAt)}</td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDate(user.updatedAt)}</td>
                    <td className={adminTableCellClass}>
                      <div className="flex flex-wrap justify-end gap-2">
                        {mayEdit ? (
                          <Link href={`/admin/users/${user.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 rounded-md")}>
                            <Edit3 aria-hidden="true" />
                            Edit
                          </Link>
                        ) : null}
                        <UserRowActions id={user.id} name={user.name} email={user.email} status={user.status} canChangeStatus={mayChangeStatus} canDelete={mayDelete} />
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
