"use client";

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

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const result = await signIn("user-credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl: "/",
    });
    setPending(false);

    if (!result?.ok || result.error) {
      setError("The email or password is incorrect, or the account is not verified.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2"><label htmlFor="email" className="text-sm font-semibold text-public-text">Email address</label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
      <div className="space-y-2"><label htmlFor="password" className="text-sm font-semibold text-public-text">Password</label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" disabled={pending} className="h-11 w-full bg-public-primary text-white hover:bg-public-primary-hover">{pending ? "Signing in..." : "Sign in"}</Button>
      <p className="text-center text-sm text-public-muted-text">Need an account? <Link href="/signup" className="font-semibold text-public-primary hover:underline">Sign up</Link></p>
    </form>
  );
}
