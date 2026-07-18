import { ArrowLeft, Clock3 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import {
  canAccessAdminSection,
  type AdminSection,
} from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export async function AdminComingSoon({
  title,
  section,
}: {
  title: string;
  section: AdminSection;
}) {
  const user = await requireAdmin();

  if (!canAccessAdminSection(user.role, section)) {
    redirect("/admin?error=forbidden");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-admin-text sm:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-admin-muted-text">
          This APOLOGETICS መፅሔት administration feature is coming soon.
        </p>
      </div>

      <section
        className="rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface p-6 shadow-[var(--admin-shadow)] sm:p-10"
        aria-labelledby="coming-soon-title"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-admin-primary-soft text-admin-primary">
          <Clock3 className="size-6" aria-hidden="true" />
        </div>
        <div className="mt-5 space-y-2">
          <h2 id="coming-soon-title" className="text-xl font-semibold text-admin-text">
            Coming Soon
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-admin-muted-text">
            This feature has been intentionally deferred and is not available
            in the current administration phase.
          </p>
        </div>
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "mt-7 h-[var(--admin-control-height)] rounded-[var(--admin-radius)] border-admin-border bg-admin-surface text-admin-text hover:border-admin-primary/30 hover:bg-admin-primary-soft hover:text-admin-primary focus-visible:ring-admin-primary/30",
          )}
        >
          <ArrowLeft />
          Back to Dashboard
        </Link>
      </section>
    </div>
  );
}
