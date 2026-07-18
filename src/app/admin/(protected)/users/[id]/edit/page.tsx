import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { UserEditForm } from "@/components/admin/user-form";
import { requireAdmin } from "@/lib/auth/guards";
import { canAccessUserAdmin } from "@/lib/user-policy";
import {
  getUserForEdit,
  UserServiceError,
} from "@/services/user.service";

const userIdSchema = z.string().trim().min(1).max(64);

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdmin();
  if (!canAccessUserAdmin(actor.role)) {
    redirect("/admin?error=forbidden");
  }

  const { id: rawId } = await params;
  const parsedId = userIdSchema.safeParse(rawId);
  if (!parsedId.success) {
    notFound();
  }

  let user;
  try {
    user = await getUserForEdit(
      { id: actor.id, role: actor.role },
      parsedId.data,
    );
  } catch (error) {
    if (error instanceof UserServiceError && error.code === "FORBIDDEN") {
      redirect("/admin/users?error=forbidden");
    }
    throw error;
  }

  if (!user) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit user</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update profile details, role, and account status.
        </p>
      </div>
      <UserEditForm
        actorId={actor.id}
        actorRole={actor.role}
        user={user}
      />
    </div>
  );
}
