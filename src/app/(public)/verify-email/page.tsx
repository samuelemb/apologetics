import Link from "next/link";

import { EmailVerificationForm } from "@/components/public/account/email-verification-form";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const { email } = await searchParams;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail) return <main className="flex flex-1 items-center justify-center px-4 py-12"><p className="text-public-muted-text">Enter your email address when you <Link className="font-semibold text-public-primary hover:underline" href="/signup">sign up</Link>.</p></main>;
  return <main className="flex flex-1 items-center justify-center px-4 py-12"><section className="w-full max-w-md rounded-[var(--public-radius)] border border-public-border bg-public-surface p-6 shadow-[var(--public-shadow)] sm:p-8"><h1 className="font-editorial text-3xl font-bold text-public-text">Verify your email</h1><p className="mt-2 text-sm text-public-muted-text">Enter the four-digit code sent to {normalizedEmail}.</p><div className="mt-6"><EmailVerificationForm email={normalizedEmail} /></div></section></main>;
}
