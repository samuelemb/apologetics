import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-listing";
import { NewsForm } from "@/components/admin/news-form";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { canEditNews } from "@/lib/news-policy";
import { cn } from "@/lib/utils";
import { getNewsForEdit, getNewsFormOptions } from "@/services/news.service";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  const article = await getNewsForEdit(id);

  if (!article) {
    notFound();
  }
  if (!canEditNews(user.role, user.id, article.authorId)) {
    redirect("/admin/news?error=forbidden");
  }
  const options = await getNewsFormOptions({
    categoryId: article.categoryId || undefined,
    tagIds: article.tagIds,
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <Link
        href="/admin/news"
        className={cn(
          buttonVariants({ variant: "ghost", size: "lg" }),
          "-ml-3 h-10 text-admin-muted-text",
        )}
      >
        <ArrowLeft aria-hidden="true" />
        Back to news
      </Link>
      <AdminPageHeader
        title="Edit article"
        description="Update content, taxonomy, and publishing status."
      />
      <NewsForm
        role={user.role}
        categories={options.categories}
        tags={options.tags}
        article={article}
      />
    </div>
  );
}
