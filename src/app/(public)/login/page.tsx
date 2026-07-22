import { PublicLoginForm } from "@/components/public/account/public-login-form";

export default function PublicLoginPage() {
  return <main className="flex flex-1 items-center justify-center px-4 py-12"><section className="w-full max-w-md rounded-[var(--public-radius)] border border-public-border bg-public-surface p-6 shadow-[var(--public-shadow)] sm:p-8"><h1 className="font-editorial text-3xl font-bold text-public-text">Sign in</h1><p className="mt-2 text-sm text-public-muted-text">Sign in to your APOLOGETICS መፅሔት account.</p><div className="mt-6"><PublicLoginForm /></div></section></main>;
}
