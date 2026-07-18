import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-listing";
import { MagazineForm } from "@/components/admin/magazine-form";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { canCreateMagazine } from "@/lib/magazine-policy";
import { cn } from "@/lib/utils";
import { getMagazineFormOptions } from "@/services/magazine.service";

export default async function NewMagazinePage() {
  await connection();

  const user = await requireAdmin();
  if (!canCreateMagazine(user.role)) {
    redirect("/admin/magazine?error=forbidden");
  }
  const options = await getMagazineFormOptions();

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
        title="New magazine issue"
        description="Add issue details, cover media, and the issue PDF."
      />
      <MagazineForm
        role={user.role}
        categories={options.categories}
        tags={options.tags}
      />
    </div>
  );
}
