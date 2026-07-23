import Link from "next/link";

import { PasswordResetCodeForm } from "@/components/public/account/password-reset-code-form";

export default async function ResetPasswordCodePage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const { email } = await searchParams;
  const resetEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!resetEmail) return <main className="flex flex-1 items-center justify-center px-4 py-12"><p className="text-public-muted-text">Enter your email address to receive a reset code. <Link href="/forgot-password" className="font-semibold text-public-primary hover:underline">Request a code</Link>.</p></main>;
  return <main className="flex flex-1 px-4 py-8 sm:px-6 sm:py-12"><section className="mx-auto w-full max-w-xl rounded-2xl border border-public-border bg-public-surface p-6 shadow-[var(--public-shadow)] sm:p-10"><p className="text-xs font-bold tracking-[0.08em] text-public-primary">RESET PASSWORD</p><h1 className="mt-4 font-editorial text-4xl font-bold text-public-text">Confirm your reset code</h1><p className="mt-3 text-public-muted-text">Enter the four-digit code sent to <strong className="text-public-text">{resetEmail}</strong>.</p><div className="mt-8"><PasswordResetCodeForm email={resetEmail} /></div></section></main>;
}
