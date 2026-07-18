import { connection } from "next/server";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/guards";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();

  const user = await requireAdmin();

  return (
    <AdminShell
      user={{
        name: user.name ?? user.email ?? "Admin user",
        email: user.email,
        image: user.image,
        role: user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
