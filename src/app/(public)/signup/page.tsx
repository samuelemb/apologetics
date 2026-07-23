import { SignupCommunityPanel } from "@/components/public/account/signup-community-panel";
import { PublicSignupForm } from "@/components/public/account/public-signup-form";

export default function SignupPage() {
  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="mx-auto grid w-full max-w-[1240px] items-stretch gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-2"><SignupCommunityPanel /></div>
        <section className="rounded-2xl border border-public-border bg-public-surface p-6 shadow-[var(--public-shadow)] sm:p-10 lg:col-span-3 lg:p-12">
          <p className="text-xs font-bold tracking-[0.08em] text-public-primary">CREATE ACCOUNT</p>
          <h1 className="mt-3 font-editorial text-4xl font-bold tracking-tight text-public-text sm:text-5xl">Create your account</h1>
          <p className="mt-3 text-sm leading-6 text-public-muted-text sm:text-base">Verify your email to participate in the APOLOGETICS community.</p>
          <div className="mt-8"><PublicSignupForm /></div>
        </section>
      </div>
    </main>
  );
}
