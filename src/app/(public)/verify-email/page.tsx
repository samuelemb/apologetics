import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { EmailVerificationExperience } from "@/components/public/account/email-verification-experience";
import { SignupCommunityPanel } from "@/components/public/account/signup-community-panel";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const { email } = await searchParams;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail) return <main className="flex flex-1 items-center justify-center px-4 py-12"><p className="text-public-muted-text">Enter your email address when you <Link className="font-semibold text-public-primary hover:underline" href="/signup">sign up</Link>.</p></main>;

  return <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14"><div className="mx-auto grid w-full max-w-[1440px] items-stretch gap-6 lg:grid-cols-5 lg:gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,6fr)_minmax(14rem,2.5fr)]"><div className="order-3 hidden lg:order-1 lg:col-span-2 lg:block xl:col-span-1 xl:row-start-1"><SignupCommunityPanel /></div><EmailVerificationExperience email={normalizedEmail} /><aside className="order-3 flex items-center gap-3 rounded-[var(--public-radius)] border border-[#eadfcf] bg-[#fffaf1] px-4 py-4 text-sm text-public-text lg:hidden"><ShieldCheck className="size-6 shrink-0 text-[#bd861f]" aria-hidden="true" />Your privacy and trust are important to us.</aside></div></main>;
}
