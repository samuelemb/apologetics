import Link from "next/link";

import { SignupCommunityPanel } from "@/components/public/account/signup-community-panel";
import { EmailVerificationForm } from "@/components/public/account/email-verification-form";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const { email } = await searchParams;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail) {
    return <main className="flex flex-1 items-center justify-center px-4 py-12"><p className="text-public-muted-text">Enter your email address when you <Link className="font-semibold text-public-primary hover:underline" href="/signup">sign up</Link>.</p></main>;
  }

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="mx-auto grid w-full max-w-[1240px] items-stretch gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="order-2 lg:order-1 lg:col-span-2"><SignupCommunityPanel /></div>
        <section className="order-1 rounded-2xl border border-public-border bg-public-surface p-6 shadow-[var(--public-shadow)] sm:p-10 lg:order-2 lg:col-span-3 lg:p-12">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto flex size-[4.5rem] items-center justify-center rounded-full border border-public-primary/15 bg-public-primary-soft text-public-primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></div>
            <h1 className="mt-5 font-editorial text-4xl font-bold tracking-tight text-public-text sm:text-5xl">Confirm your email</h1>
            <p className="mt-3 text-base leading-7 text-public-muted-text">We sent a four-digit verification code to<br /><strong className="font-bold text-public-text">{normalizedEmail}</strong></p>
            <p className="mt-4 text-sm leading-6 text-public-muted-text">Enter the code below to verify your email address.</p>
            <div className="mt-8"><EmailVerificationForm email={normalizedEmail} /></div>
          </div>
        </section>
      </div>
    </main>
  );
}
