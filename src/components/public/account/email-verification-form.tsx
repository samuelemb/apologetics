"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import {
  resendVerificationAction,
} from "@/app/(public)/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialPublicAccountActionState } from "@/lib/public-account-action-state";

export function EmailVerificationForm({ email }: { email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [resendState, resendAction, resendPending] = useActionState(resendVerificationAction, initialPublicAccountActionState);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const result = await signIn("user-verification", {
      email,
      code: String(formData.get("code") ?? ""),
      redirect: false,
      callbackUrl: "/",
    });
    setPending(false);
    if (!result?.ok || result.error) {
      setError("The code is invalid or expired. Check it and try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form action={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2"><label htmlFor="code" className="text-sm font-semibold text-public-text">Four-digit code</label><Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} pattern="[0-9]{4}" required className="text-center text-lg tracking-[0.5em]" /></div>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={pending} className="h-11 w-full bg-public-primary text-white hover:bg-public-primary-hover">{pending ? "Verifying..." : "Verify email"}</Button>
      </form>
      <form action={resendAction} className="text-center"><input type="hidden" name="email" value={email} />{resendState.status === "error" ? <p role="alert" className="mb-2 text-sm text-red-700">{resendState.message}</p> : null}{resendState.status === "success" ? <p className="mb-2 text-sm text-green-700">{resendState.message}</p> : null}<Button type="submit" variant="link" disabled={resendPending} className="text-public-primary">{resendPending ? "Sending..." : "Resend code"}</Button></form>
    </div>
  );
}
