import { redirect } from "next/navigation";

import { TagForm } from "@/components/admin/tag-form";
import { requireAdmin } from "@/lib/auth/guards";
import { canCreateTag } from "@/lib/tag-policy";

export default async function NewTagPage() {
  const user = await requireAdmin();
  if (!canCreateTag(user.role)) redirect("/admin?error=forbidden");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New tag</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a reusable tag for published content.</p>
      </div>
      <TagForm />
    </div>
  );
}
