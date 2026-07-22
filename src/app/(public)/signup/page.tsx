import { PublicSignupForm } from "@/components/public/account/public-signup-form";

export default function SignupPage() {
  return <main className="flex flex-1 items-center justify-center px-4 py-12"><section className="w-full max-w-md rounded-[var(--public-radius)] border border-public-border bg-public-surface p-6 shadow-[var(--public-shadow)] sm:p-8"><h1 className="font-editorial text-3xl font-bold text-public-text">Create your account</h1><p className="mt-2 text-sm text-public-muted-text">Join APOLOGETICS መፅሔት and verify your email to participate.</p><div className="mt-6"><PublicSignupForm /></div></section></main>;
}
