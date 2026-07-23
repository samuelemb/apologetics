"use client";

import { CircleAlert, Mail } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { resendVerificationAction } from "@/app/(public)/account-actions";
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
    const result = await signIn("user-verification", { email, code: String(formData.get("code") ?? ""), redirect: false, callbackUrl: "/" });
    setPending(false);
    if (!result?.ok || result.error) {
      setError("The code is invalid or expired. Check it and try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const message = error ?? (resendState.status === "error" ? resendState.message : undefined);

  return (
    <div className="space-y-6">
      {message ? <p id="verification-error" role="alert" className="flex items-start gap-2 rounded-[var(--public-radius)] border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm text-red-800"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{message}</p> : null}
      {resendState.status === "success" ? <p role="status" className="rounded-[var(--public-radius)] border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">{resendState.message}</p> : null}
      <form id="verification-form" action={onSubmit} noValidate>
        <div>
          <label htmlFor="code" className="sr-only">Four-digit verification code</label>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} pattern="[0-9]{4}" required aria-invalid={Boolean(message) || undefined} aria-describedby={message ? "verification-error" : undefined} placeholder="0000" className="mx-auto h-[4.5rem] max-w-[19rem] border-public-border bg-public-surface px-4 text-center font-editorial text-3xl tracking-[0.45em] shadow-none placeholder:tracking-[0.45em] focus-visible:border-public-primary focus-visible:ring-public-primary/20" />
        </div>
      </form>
      <p className="text-sm text-public-muted-text">Didn’t receive the code?</p>
      <form action={resendAction}><input type="hidden" name="email" value={email} /><Button type="submit" variant="link" disabled={resendPending} className="h-auto p-0 font-semibold text-public-primary hover:text-public-primary-hover">{resendPending ? "Sending code..." : "Resend code"}</Button></form>
      <div className="flex items-center gap-3 text-sm text-public-muted-text"><span className="h-px flex-1 bg-public-border" /><span>or</span><span className="h-px flex-1 bg-public-border" /></div>
      <Link href="/signup" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--public-radius)] border border-public-primary/35 px-4 text-sm font-semibold text-public-primary transition-colors hover:bg-public-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"><Mail className="size-4" aria-hidden="true" />Change email address</Link>
      <Button form="verification-form" type="submit" disabled={pending} className="h-[3.25rem] w-full rounded-[var(--public-radius)] bg-public-primary text-base font-bold text-white hover:bg-public-primary-hover focus-visible:ring-public-primary/30">{pending ? "Verifying..." : "Verify account"}</Button>
      <p className="text-sm text-public-muted-text">Having trouble? Check your spam folder or <Link href="/contact" className="font-semibold text-public-primary hover:underline">contact our support</Link>.</p>
    </div>
  );
}
