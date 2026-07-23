"use client";

import { CircleAlert, CircleCheck, Eye, EyeOff, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { resetPasswordAction } from "@/app/(public)/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialPublicAccountActionState } from "@/lib/public-account-action-state";

export function PasswordResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialPublicAccountActionState);
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const complete = state.status === "success";
  return <form action={action} className="space-y-5" noValidate><input type="hidden" name="token" value={token} />{state.status !== "idle" ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "flex gap-2 rounded-[var(--public-radius)] border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" : "flex gap-2 rounded-[var(--public-radius)] border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800"}>{state.status === "error" ? <CircleAlert className="size-5 shrink-0" aria-hidden="true" /> : <CircleCheck className="size-5 shrink-0" aria-hidden="true" />} {state.message}</p> : null}<PasswordInput id="password" name="password" label="New password" visible={visible} setVisible={setVisible} disabled={complete} /><PasswordInput id="confirm-password" name="confirmPassword" label="Confirm new password" visible={confirmVisible} setVisible={setConfirmVisible} disabled={complete} /><p className="rounded-[var(--public-radius)] border border-[#eadfcf] bg-[#fffaf1] px-4 py-3 text-sm leading-6 text-public-muted-text">Use at least 12 characters with uppercase, lowercase, and a number.</p>{complete ? <Link href="/login" className="inline-flex h-[3.25rem] w-full items-center justify-center rounded-[var(--public-radius)] bg-public-primary text-base font-bold text-white hover:bg-public-primary-hover">Sign in</Link> : <Button type="submit" disabled={pending} className="h-[3.25rem] w-full rounded-[var(--public-radius)] bg-public-primary text-base font-bold text-white hover:bg-public-primary-hover">{pending ? "Resetting password..." : "Reset password"}</Button>}</form>;
}

function PasswordInput({ id, name, label, visible, setVisible, disabled }: { id: string; name: string; label: string; visible: boolean; setVisible: (visible: boolean) => void; disabled: boolean }) { return <div className="space-y-2"><label htmlFor={id} className="text-sm font-bold text-public-text">{label}</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-[1.125rem] size-5 text-public-muted-text" aria-hidden="true" /><Input id={id} name={name} type={visible ? "text" : "password"} autoComplete="new-password" placeholder={`Enter your ${label.toLowerCase()}`} required disabled={disabled} className="h-[3.25rem] border-public-border bg-public-surface px-11 text-base shadow-none focus-visible:border-public-primary focus-visible:ring-public-primary/20" /><button type="button" onClick={() => setVisible(!visible)} disabled={disabled} className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-sm text-public-muted-text hover:bg-public-primary-soft hover:text-public-primary" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}>{visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}</button></div></div>; }
