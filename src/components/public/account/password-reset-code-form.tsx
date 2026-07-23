"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { resendPasswordResetCodeAction, verifyPasswordResetCodeAction } from "@/app/(public)/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialPublicAccountActionState } from "@/lib/public-account-action-state";

export function PasswordResetCodeForm({ email }: { email: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(verifyPasswordResetCodeAction, initialPublicAccountActionState);
  const [resendState, resendAction, resendPending] = useActionState(resendPasswordResetCodeAction, initialPublicAccountActionState);
  useEffect(() => { if (state.status === "success" && state.token) router.replace(`/reset-password?token=${encodeURIComponent(state.token)}`); }, [router, state.status, state.token]);
  return <div className="space-y-6"><form action={action} className="space-y-5" noValidate><input type="hidden" name="email" value={email} />{state.status === "error" ? <StatusMessage error message={state.message} /> : null}<div className="space-y-2"><label htmlFor="code" className="text-sm font-bold text-public-text">Four-digit reset code</label><Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} pattern="[0-9]{4}" placeholder="0000" required className="h-[3.5rem] border-public-border text-center font-editorial text-xl tracking-[0.45em] shadow-none focus-visible:border-public-primary focus-visible:ring-public-primary/20" /></div><Button type="submit" disabled={pending} className="h-[3.25rem] w-full rounded-[var(--public-radius)] bg-public-primary text-base font-bold text-white hover:bg-public-primary-hover">{pending ? "Verifying code..." : "Continue"}</Button></form><div className="text-center"><p className="text-sm text-public-muted-text">Didn&apos;t receive the code?</p><form action={resendAction} className="mt-1"><input type="hidden" name="email" value={email} />{resendState.status !== "idle" ? <div className="mb-2"><StatusMessage error={resendState.status === "error"} message={resendState.message} /></div> : null}<Button type="submit" variant="link" disabled={resendPending} className="text-public-primary">{resendPending ? "Sending code..." : "Resend code"}</Button></form></div></div>;
}

function StatusMessage({ error, message }: { error: boolean; message?: string }) { return <p role={error ? "alert" : "status"} className={error ? "flex gap-2 rounded-[var(--public-radius)] border border-red-200 bg-red-50 px-3 py-3 text-left text-sm text-red-800" : "flex gap-2 rounded-[var(--public-radius)] border border-green-200 bg-green-50 px-3 py-3 text-left text-sm text-green-800"}>{error ? <CircleAlert className="size-5 shrink-0" aria-hidden="true" /> : <CircleCheck className="size-5 shrink-0" aria-hidden="true" />}{message}</p>; }
