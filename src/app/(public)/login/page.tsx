import { Sparkles } from "lucide-react";

import { PublicLoginForm } from "@/components/public/account/public-login-form";
import { SignupCommunityPanel } from "@/components/public/account/signup-community-panel";

export default function PublicLoginPage() {
  return <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14"><div className="mx-auto grid w-full max-w-[1240px] items-stretch gap-6 lg:grid-cols-5 lg:gap-8"><div className="order-2 lg:order-1 lg:col-span-2"><SignupCommunityPanel /></div><section className="order-1 rounded-2xl border border-public-border bg-public-surface p-6 shadow-[var(--public-shadow)] sm:p-10 lg:order-2 lg:col-span-3 lg:p-12"><div className="mx-auto max-w-xl text-center"><div className="relative mx-auto flex h-20 max-w-48 items-center justify-center"><Sparkles className="absolute left-2 size-5 text-[#c79538]" aria-hidden="true" /><div className="h-12 w-px bg-[#c79538]" aria-hidden="true" /><Sparkles className="absolute right-2 size-5 text-[#c79538]" aria-hidden="true" /></div><p className="text-xs font-bold tracking-[0.08em] text-public-primary">WELCOME BACK</p><p className="mt-3 text-sm leading-6 text-public-muted-text sm:text-base">Sign in to your account to continue.</p><div className="mt-8 text-left"><PublicLoginForm /></div></div></section></div></main>;
}
