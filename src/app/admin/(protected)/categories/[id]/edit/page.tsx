import { notFound, redirect } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { requireAdmin } from "@/lib/auth/guards";
import { canEditCategory } from "@/lib/category-policy";
import { getCategoryForEdit } from "@/services/category.service";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!canEditCategory(user.role)) redirect("/admin?error=forbidden");
  const { id } = await params;
  const category = await getCategoryForEdit({ id: user.id, role: user.role }, id);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit category</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update taxonomy details and availability.</p>
      </div>
      <CategoryForm category={category} />
    </div>
  );
}
