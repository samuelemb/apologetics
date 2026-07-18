import { redirect } from "next/navigation";
import Image from "next/image";

import { LoginForm } from "@/components/admin/login-form";
import { getCurrentAdmin } from "@/lib/auth/guards";

export default async function AdminLoginPage() {
  const user = await getCurrentAdmin();

  if (user) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-background px-4 py-10 font-[family-name:var(--font-geist-sans)] text-admin-text">
      <section
        className="w-full max-w-md rounded-[var(--admin-radius)] border border-admin-border border-t-4 border-t-admin-primary bg-admin-surface px-6 py-8 shadow-[var(--admin-shadow)] sm:px-9 sm:py-10"
        aria-labelledby="login-title"
      >
        <div className="mb-8 text-center">
          <Image
            src="/images/apologetics-logo.png"
            alt="APOLOGETICS logo"
            width={88}
            height={88}
            priority
            className="mx-auto size-22 rounded-full bg-white object-cover"
          />
          <h1 id="login-title" className="mt-5 font-serif text-2xl font-semibold text-admin-text">
            APOLOGETICS መፅሔት
          </h1>
          <p className="mt-2 text-sm text-admin-muted-text">
            Sign in to the administration portal
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
