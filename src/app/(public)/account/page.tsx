import { AccountNavigation } from "@/components/public/account/account-navigation";
import { AccountOverview } from "@/components/public/account/account-overview";
import { requirePublicUser } from "@/lib/auth/guards";
import { getPublicAccountOverview } from "@/services/public-account-overview.service";

export default async function PublicAccountPage() {
  const user = await requirePublicUser();
  const overview = await getPublicAccountOverview(user.id);

  return (
    <main className="flex-1 bg-public-background px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden border-r border-public-border pr-7 lg:block">
          <h1 className="font-editorial text-3xl font-bold text-public-text">My Account</h1>
          <p className="mt-2 text-sm leading-6 text-public-muted-text">Manage your profile, security and community activity.</p>
          <div className="mt-7"><AccountNavigation /></div>
          <blockquote className="mt-10 rounded-[var(--public-radius)] border border-public-border bg-public-surface p-5 text-sm leading-6 text-public-muted-text shadow-[var(--public-shadow)]">
            <p className="font-editorial text-base text-public-text">Seeking knowledge is an obligation upon every Muslim.</p>
            <footer className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-public-primary">Ibn Majah</footer>
          </blockquote>
        </aside>

        <section className="min-w-0">
          <div className="mb-7 lg:hidden">
            <h1 className="font-editorial text-3xl font-bold text-public-text">My Account</h1>
            <p className="mt-2 text-sm text-public-muted-text">Manage your profile, security and community activity.</p>
            <div className="mt-5 overflow-x-auto pb-1"><AccountNavigation mobile /></div>
          </div>
          <AccountOverview
            member={{
              name: user.name || "Member",
              email: user.email,
              image: user.image,
              emailVerifiedAt: user.emailVerifiedAt,
              createdAt: user.createdAt,
            }}
            overview={overview}
          />
        </section>
      </div>
    </main>
  );
}
