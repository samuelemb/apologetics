import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-listing";
import { NewsForm } from "@/components/admin/news-form";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { canCreateNews } from "@/lib/news-policy";
import { cn } from "@/lib/utils";
import { getNewsFormOptions } from "@/services/news.service";

export default async function NewNewsPage() {
  const user = await requireAdmin();
  if (!canCreateNews(user.role)) {
    redirect("/admin/news?error=forbidden");
  }
  const options = await getNewsFormOptions();

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
        title="New article"
        description="Create a news draft, schedule it, or publish it now."
      />
      <NewsForm role={user.role} categories={options.categories} tags={options.tags} />
    </div>
  );
}
