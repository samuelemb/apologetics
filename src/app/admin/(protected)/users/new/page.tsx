import { redirect } from "next/navigation";

import { UserCreateForm } from "@/components/admin/user-form";
import { requireAdmin } from "@/lib/auth/guards";
import { canAccessUserAdmin } from "@/lib/user-policy";

export default async function NewUserPage() {
  const actor = await requireAdmin();
  if (!canAccessUserAdmin(actor.role)) {
    redirect("/admin?error=forbidden");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add user</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an active administrator or a pending invited account.
        </p>
      </div>
      <UserCreateForm actorRole={actor.role} />
    </div>
  );
}
