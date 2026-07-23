import { AccountNavigation } from "@/components/public/account/account-navigation";
import { EditProfileForm } from "@/components/public/account/edit-profile-form";
import { requirePublicUser } from "@/lib/auth/guards";

export default async function EditProfilePage() {
  const user = await requirePublicUser();

  return (
    <main className="flex-1 bg-public-background px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden border-r border-public-border pr-7 lg:block">
          <h1 className="font-editorial text-3xl font-bold text-public-text">My Account</h1>
          <div className="mt-7"><AccountNavigation activeHref="/account/profile" /></div>
          <blockquote className="mt-10 rounded-[var(--public-radius)] border border-public-border bg-public-surface p-5 text-sm leading-6 text-public-muted-text shadow-[var(--public-shadow)]">
            <p className="font-editorial text-base text-public-text">Seeking knowledge is an obligation upon every Muslim.</p>
            <footer className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-public-primary">Ibn Majah</footer>
          </blockquote>
        </aside>

        <section className="min-w-0">
          <header>
            <h1 className="font-editorial text-3xl font-bold text-public-text sm:text-4xl">Edit Profile</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-public-muted-text sm:text-base">Update your personal information and how others see you on APOLOGETICS.</p>
          </header>
          <div className="mt-6 overflow-x-auto pb-1 lg:hidden"><AccountNavigation mobile activeHref="/account/profile" /></div>
          <div className="mt-7"><EditProfileForm member={user} /></div>
        </section>
      </div>
    </main>
  );
}
