import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-listing";
import { MagazineForm } from "@/components/admin/magazine-form";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { canEditMagazine } from "@/lib/magazine-policy";
import { cn } from "@/lib/utils";
import {
  getMagazineForEdit,
  getMagazineFormOptions,
} from "@/services/magazine.service";

export default async function EditMagazinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  const issue = await getMagazineForEdit(id);

  if (!issue) {
    notFound();
  }
  if (
    !canEditMagazine(
      user.role,
      user.id,
      issue.authorId,
      issue.status,
    )
  ) {
    redirect("/admin/magazine?error=forbidden");
  }
  const options = await getMagazineFormOptions({
    categoryId: issue.categoryId || undefined,
    tagIds: issue.tagIds,
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <Link
        href="/admin/magazine"
        className={cn(
          buttonVariants({ variant: "ghost", size: "lg" }),
          "-ml-3 h-10 text-admin-muted-text",
        )}
      >
        <ArrowLeft aria-hidden="true" />
        Back to magazine
      </Link>
      <AdminPageHeader
        title="Edit magazine issue"
        description="Update issue details, taxonomy, and publication status."
      />
      <MagazineForm
        role={user.role}
        categories={options.categories}
        tags={options.tags}
        issue={issue}
      />
    </div>
  );
}
