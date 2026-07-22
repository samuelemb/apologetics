"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  registerPublicUserAction,
} from "@/app/(public)/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialPublicAccountActionState } from "@/lib/public-account-action-state";

export function PublicSignupForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    registerPublicUserAction,
    initialPublicAccountActionState,
  );

  useEffect(() => {
    if (state.status === "success" && state.email) {
      router.replace(`/verify-email?email=${encodeURIComponent(state.email)}`);
    }
  }, [router, state.email, state.status]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2"><label htmlFor="name" className="text-sm font-semibold text-public-text">Name</label><Input id="name" name="name" autoComplete="name" required /></div>
      <div className="space-y-2"><label htmlFor="email" className="text-sm font-semibold text-public-text">Email address</label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
      <div className="space-y-2"><label htmlFor="password" className="text-sm font-semibold text-public-text">Password</label><Input id="password" name="password" type="password" autoComplete="new-password" required /><p className="text-xs text-public-muted-text">At least 12 characters with uppercase, lowercase, and a number.</p></div>
      <div className="space-y-2"><label htmlFor="confirm-password" className="text-sm font-semibold text-public-text">Confirm password</label><Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required /></div>
      {state.status === "error" ? <p role="alert" className="text-sm text-red-700">{state.message}</p> : null}
      <Button type="submit" disabled={pending} className="h-11 w-full bg-public-primary text-white hover:bg-public-primary-hover">{pending ? "Creating account..." : "Create account"}</Button>
      <p className="text-center text-sm text-public-muted-text">Already have an account? <Link href="/login" className="font-semibold text-public-primary hover:underline">Sign in</Link></p>
    </form>
  );
}
