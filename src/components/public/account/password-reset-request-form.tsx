"use client";

import { CircleAlert, CircleCheck, Mail } from "lucide-react";
import { useActionState } from "react";

import { requestPasswordResetAction } from "@/app/(public)/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialPublicAccountActionState } from "@/lib/public-account-action-state";

export function PasswordResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialPublicAccountActionState);
  const isError = state.status === "error";
  return <form action={action} className="space-y-5" noValidate>{state.status !== "idle" ? <p role={isError ? "alert" : "status"} className={isError ? "flex gap-2 rounded-[var(--public-radius)] border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" : "flex gap-2 rounded-[var(--public-radius)] border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800"}>{isError ? <CircleAlert className="size-5 shrink-0" aria-hidden="true" /> : <CircleCheck className="size-5 shrink-0" aria-hidden="true" />}{state.message}</p> : null}<div className="space-y-2"><label htmlFor="email" className="text-sm font-bold text-public-text">Email address</label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-[1.125rem] size-5 text-public-muted-text" aria-hidden="true" /><Input id="email" name="email" type="email" autoComplete="email" placeholder="Enter your email address" required className="h-[3.25rem] border-public-border bg-public-surface pl-11 text-base shadow-none focus-visible:border-public-primary focus-visible:ring-public-primary/20" /></div></div><p className="flex items-start gap-2 rounded-[var(--public-radius)] border border-[#eadfcf] bg-[#fffaf1] px-4 py-3 text-sm leading-6 text-public-muted-text"><CircleAlert className="mt-0.5 size-5 shrink-0 text-[#bd861f]" aria-hidden="true" />We'll send a password reset link to your email. If you don't see it, check your spam or junk folder.</p><Button type="submit" disabled={pending} className="h-[3.25rem] w-full rounded-[var(--public-radius)] bg-public-primary text-base font-bold text-white hover:bg-public-primary-hover">{pending ? "Sending reset link..." : "Send reset link"}</Button></form>;
}
