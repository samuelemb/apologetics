"use client";

import { CircleAlert, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PublicLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const result = await signIn("user-credentials", { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? ""), redirect: false, callbackUrl: "/" });
    setPending(false);
    if (!result?.ok || result.error) { setError("The email or password is incorrect, or the account is not verified."); return; }
    router.push("/");
    router.refresh();
  }

  return <form action={onSubmit} className="space-y-5" noValidate>{error ? <p id="login-error" role="alert" className="flex items-start gap-2 rounded-[var(--public-radius)] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{error}</p> : null}<div className="space-y-2"><label htmlFor="email" className="text-sm font-bold text-public-text">Email address</label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-[1.125rem] size-5 text-public-muted-text" aria-hidden="true" /><Input id="email" name="email" type="email" autoComplete="email" placeholder="Enter your email address" required aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "login-error" : undefined} className="h-[3.25rem] border-public-border bg-public-surface pl-11 text-base shadow-none focus-visible:border-public-primary focus-visible:ring-public-primary/20" /></div></div><div className="space-y-2"><label htmlFor="password" className="text-sm font-bold text-public-text">Password</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-[1.125rem] size-5 text-public-muted-text" aria-hidden="true" /><Input id="password" name="password" type={passwordVisible ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "login-error" : undefined} className="h-[3.25rem] border-public-border bg-public-surface px-11 text-base shadow-none focus-visible:border-public-primary focus-visible:ring-public-primary/20" /><button type="button" onClick={() => setPasswordVisible((visible) => !visible)} className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-sm text-public-muted-text hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-public-primary" aria-label={`${passwordVisible ? "Hide" : "Show"} password`}>{passwordVisible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}</button></div></div><div className="text-right"><Link href="/forgot-password" className="text-sm font-semibold text-public-primary hover:underline">Forgot password?</Link></div><Button type="submit" disabled={pending} className="h-[3.25rem] w-full rounded-[var(--public-radius)] bg-public-primary text-base font-bold text-white hover:bg-public-primary-hover focus-visible:ring-public-primary/30">{pending ? "Signing in..." : "Sign in"}</Button><p className="pt-1 text-center text-sm text-public-muted-text">Don't have an account? <Link href="/signup" className="font-bold text-public-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary">Create account</Link></p></form>;
}
