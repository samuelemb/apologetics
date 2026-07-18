import { redirect } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { requireAdmin } from "@/lib/auth/guards";
import { canCreateCategory } from "@/lib/category-policy";

export default async function NewCategoryPage() {
  const user = await requireAdmin();
  if (!canCreateCategory(user.role)) redirect("/admin?error=forbidden");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New category</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a category for published content.</p>
      </div>
      <CategoryForm />
    </div>
  );
}
