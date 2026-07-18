import { PageTitle } from "@/components/page-title";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/guards";
import {
  canAccessAdminSection,
  type AdminSection,
} from "@/lib/auth/permissions";

export async function ProtectedPageTitle({
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

  return <PageTitle title={title} />;
}
