"use client";

import { CircleAlert, CircleCheck, Eye, EyeOff, LockKeyhole, Mail, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type ReactNode } from "react";

import { registerPublicUserAction } from "@/app/(public)/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialPublicAccountActionState } from "@/lib/public-account-action-state";

export function PublicSignupForm() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [state, formAction, pending] = useActionState(registerPublicUserAction, initialPublicAccountActionState);

  useEffect(() => {
    if (state.status === "success" && state.email) {
      router.replace(`/verify-email?email=${encodeURIComponent(state.email)}`);
    }
  }, [router, state.email, state.status]);

  const hasError = state.status === "error";
  const requirements = [
    { label: "12+ characters", met: password.length >= 12 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Lowercase", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
  ];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {hasError ? <p id="signup-form-error" role="alert" className="flex items-start gap-2 rounded-[var(--public-radius)] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{state.message}</p> : null}
      <Field label="Full name" htmlFor="name" icon={UserRound}>
        <Input id="name" name="name" autoComplete="name" placeholder="Enter your full name" required aria-invalid={hasError || undefined} aria-describedby={hasError ? "signup-form-error" : undefined} className="h-[3.25rem] border-public-border bg-public-surface pl-11 text-base shadow-none focus-visible:border-public-primary focus-visible:ring-public-primary/20" />
      </Field>
      <Field label="Email address" htmlFor="email" icon={Mail}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="Enter your email address" required aria-invalid={hasError || undefined} aria-describedby={hasError ? "signup-form-error" : undefined} className="h-[3.25rem] border-public-border bg-public-surface pl-11 text-base shadow-none focus-visible:border-public-primary focus-visible:ring-public-primary/20" />
      </Field>
      <Field label="Password" htmlFor="password" icon={LockKeyhole}>
        <Input id="password" name="password" type={passwordVisible ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" required value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={hasError || undefined} aria-describedby={`password-requirements${hasError ? " signup-form-error" : ""}`} className="h-[3.25rem] border-public-border bg-public-surface px-11 text-base shadow-none focus-visible:border-public-primary focus-visible:ring-public-primary/20" />
        <PasswordToggle visible={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)} field="password" />
        <div id="password-requirements" className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-public-muted-text">
          {requirements.map(({ label, met }) => <span key={label} className={met ? "inline-flex items-center gap-1 text-public-primary" : "inline-flex items-center gap-1"}><CircleCheck className="size-3.5" aria-hidden="true" />{label}</span>)}
        </div>
      </Field>
      <Field label="Confirm password" htmlFor="confirm-password" icon={LockKeyhole}>
        <Input id="confirm-password" name="confirmPassword" type={confirmPasswordVisible ? "text" : "password"} autoComplete="new-password" placeholder="Confirm your password" required aria-invalid={hasError || undefined} aria-describedby={hasError ? "signup-form-error" : undefined} className="h-[3.25rem] border-public-border bg-public-surface px-11 text-base shadow-none focus-visible:border-public-primary focus-visible:ring-public-primary/20" />
        <PasswordToggle visible={confirmPasswordVisible} onClick={() => setConfirmPasswordVisible((visible) => !visible)} field="confirmation password" />
      </Field>
      <Button type="submit" disabled={pending} className="h-[3.25rem] w-full rounded-[var(--public-radius)] bg-public-primary text-base font-bold text-white hover:bg-public-primary-hover focus-visible:ring-public-primary/30">{pending ? "Creating account..." : "Create account"}</Button>
      <p className="pt-1 text-center text-sm text-public-muted-text">Already have an account? <Link href="/login" className="font-bold text-public-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary">Sign in</Link></p>
    </form>
  );
}

function Field({ label, htmlFor, icon: Icon, children }: { label: string; htmlFor: string; icon: LucideIcon; children: ReactNode }) {
  return <div className="space-y-2"><label htmlFor={htmlFor} className="text-sm font-bold text-public-text">{label}</label><div className="relative"><Icon className="pointer-events-none absolute left-3 top-[1.125rem] size-5 text-public-muted-text" aria-hidden="true" />{children}</div></div>;
}

function PasswordToggle({ visible, onClick, field }: { visible: boolean; onClick: () => void; field: string }) {
  return <button type="button" onClick={onClick} className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-sm text-public-muted-text hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-public-primary" aria-label={`${visible ? "Hide" : "Show"} ${field}`}>{visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}</button>;
}
