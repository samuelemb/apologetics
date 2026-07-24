"use client";

import { Eye, EyeOff, LockKeyhole, ShieldCheck, Trash2, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useActionState, useEffect, useRef, useState } from "react";

import { changePublicPasswordAction, deletePublicAccountAction } from "@/app/(public)/account-actions";
import { Button } from "@/components/ui/button";
import { initialPublicAccountActionState } from "@/lib/public-account-action-state";

function PasswordField({ id, name = id, label, autoComplete }: { id: string; name?: string; label: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-public-text">{label}</label><div className="relative"><input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required className="profile-input pr-12" /><button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-[var(--public-radius)] text-public-muted-text hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}>{visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</button></div></div>;
}

export function SecuritySettings() {
  const [passwordState, passwordAction, passwordPending] = useActionState(changePublicPasswordAction, initialPublicAccountActionState);
  const [deleteState, deleteAction, deletePending] = useActionState(deletePublicAccountAction, initialPublicAccountActionState);
  const [dialogOpen, setDialogOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const passwordFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!dialogOpen) { triggerRef.current?.focus(); return; }
    const first = dialogRef.current?.querySelector<HTMLElement>("input, button");
    first?.focus();
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape" && !deletePending) setDialogOpen(false); }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [deletePending, dialogOpen]);

  useEffect(() => { if (deleteState.status === "success") void signOut({ callbackUrl: "/" }); }, [deleteState.status]);
  useEffect(() => { if (passwordState.status === "success") passwordFormRef.current?.reset(); }, [passwordState.status]);

  return <div className="space-y-5"><section className="relative overflow-hidden rounded-[var(--public-radius)] border border-public-border bg-public-surface p-5 shadow-[var(--public-shadow)] sm:p-7"><div aria-hidden="true" className="absolute right-0 top-0 size-40 -translate-y-1/3 translate-x-1/3 rotate-45 border border-public-primary/10" /><div className="relative"><div className="flex items-start gap-3"><span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f7edde] text-public-text"><LockKeyhole className="size-5" aria-hidden="true" /></span><div><h2 className="font-editorial text-xl font-bold text-public-text">Change Password</h2><p className="mt-1 text-sm text-public-muted-text">Update your password regularly to keep your account safe.</p></div></div><form ref={passwordFormRef} action={passwordAction} className="mt-6 max-w-xl space-y-4"><PasswordField id="currentPassword" label="Current Password" autoComplete="current-password" /><PasswordField id="password" label="New Password" autoComplete="new-password" /><p className="-mt-2 text-xs leading-5 text-public-muted-text">Use at least 12 characters with uppercase, lowercase, and a number.</p><PasswordField id="confirmPassword" label="Confirm New Password" autoComplete="new-password" /><Button type="submit" disabled={passwordPending} className="min-h-11 bg-public-primary text-white hover:bg-public-primary-hover">{passwordPending ? "Updating..." : "Update Password"}</Button><div aria-live="polite">{passwordState.status === "success" ? <p role="status" className="text-sm font-medium text-green-700">{passwordState.message}</p> : null}{passwordState.status === "error" ? <p role="alert" className="text-sm font-medium text-red-700">{passwordState.message}</p> : null}</div></form></div></section>

    <section className="rounded-[var(--public-radius)] border border-public-border bg-public-surface p-5 shadow-[var(--public-shadow)] sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-7"><div className="flex gap-3"><span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f7edde] text-public-text"><Trash2 className="size-5" aria-hidden="true" /></span><div><h2 className="font-editorial text-xl font-bold text-public-text">Delete Account</h2><p className="mt-1 text-sm text-public-muted-text">Permanently delete your account and associated member data.</p><p className="mt-2 text-sm font-semibold text-public-primary">This action cannot be undone.</p></div></div><Button ref={triggerRef} type="button" variant="outline" onClick={() => setDialogOpen(true)} className="mt-5 min-h-11 w-full border-public-primary/60 text-public-primary hover:bg-public-primary-soft sm:mt-0 sm:w-auto">Delete Account</Button></section>

    <aside className="rounded-[var(--public-radius)] border border-green-800/15 bg-green-50/50 p-5 shadow-[var(--public-shadow)]"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-6 shrink-0 text-green-800" aria-hidden="true" /><div><h2 className="font-editorial text-lg font-bold text-public-text">Help keep your account secure</h2><p className="mt-1 text-sm leading-6 text-public-muted-text">Never share your password with anyone. APOLOGETICS will never ask for your password.</p></div></div></aside>

    {dialogOpen ? <div className="fixed inset-0 z-50 flex items-end bg-public-text/30 p-4 sm:items-center sm:justify-center" role="presentation"><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-md rounded-[var(--public-radius)] bg-public-surface p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="delete-account-title" className="font-editorial text-2xl font-bold text-public-text">Delete your account?</h2><p className="mt-2 text-sm leading-6 text-public-muted-text">This permanently removes your profile, likes, comments, replies, verification data, and uploaded profile images.</p></div><button type="button" onClick={() => setDialogOpen(false)} disabled={deletePending} className="inline-flex size-10 items-center justify-center rounded-[var(--public-radius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary" aria-label="Close delete account confirmation"><X className="size-5" aria-hidden="true" /></button></div><form action={deleteAction} className="mt-5 space-y-4"><div><label htmlFor="confirmation" className="mb-2 block text-sm font-semibold text-public-text">Type DELETE to confirm</label><input id="confirmation" name="confirmation" required className="profile-input" /></div><PasswordField id="delete-current-password" name="currentPassword" label="Current Password" autoComplete="current-password" /><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={deletePending} onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={deletePending} className="bg-public-primary text-white hover:bg-public-primary-hover">{deletePending ? "Deleting..." : "Delete my account permanently"}</Button></div><div aria-live="polite">{deleteState.status === "error" ? <p role="alert" className="text-sm font-medium text-red-700">{deleteState.message}</p> : null}</div></form></div></div> : null}</div>;
}
