import { PublicProfileForm } from "@/components/public/account/public-profile-form";
import { requirePublicUser } from "@/lib/auth/guards";

export default async function PublicAccountPage() {
  const user = await requirePublicUser();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-[var(--public-radius)] border border-public-border bg-public-surface p-6 shadow-[var(--public-shadow)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-public-primary">Verified account</p>
        <h1 className="mt-2 font-editorial text-3xl font-bold text-public-text">Your account</h1>
        <p className="mt-2 text-sm text-public-muted-text">Manage the name shown with your future community activity.</p>
        <div className="mt-6"><PublicProfileForm name={user.name} email={user.email} /></div>
      </section>
    </main>
  );
}
