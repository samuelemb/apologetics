"use client";

/* eslint-disable react/no-unescaped-entities */

import { LoaderCircle, PencilLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { resendVerificationAction } from "@/app/(public)/account-actions";
import { Button } from "@/components/ui/button";
import { initialPublicAccountActionState } from "@/lib/public-account-action-state";

export type VerificationFeedback = { kind: "error" | "success"; title: string; message: string };

type EmailVerificationFormProps = { email: string; onFeedbackChange: (feedback: VerificationFeedback | null) => void };

export function EmailVerificationForm({ email, onFeedbackChange }: EmailVerificationFormProps) {
  const router = useRouter();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendState, resendAction, resendPending] = useActionState(resendVerificationAction, initialPublicAccountActionState);
  const code = digits.join("");
  const disabled = pending || verified;

  useEffect(() => {
    if (resendState.status === "error") onFeedbackChange({ kind: "error", title: "Unable to resend code", message: resendState.message ?? "Please try again." });
    if (resendState.status === "success") onFeedbackChange(null);
  }, [onFeedbackChange, resendState.message, resendState.status]);

  useEffect(() => () => onFeedbackChange(null), [onFeedbackChange]);

  function focusInput(index: number) { inputRefs.current[index]?.focus(); }
  function updateDigits(nextDigits: string[], focusIndex?: number) { setDigits(nextDigits); if (focusIndex !== undefined) requestAnimationFrame(() => focusInput(focusIndex)); }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    updateDigits(nextDigits, digit && index < nextDigits.length - 1 ? index + 1 : undefined);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) { event.preventDefault(); const nextDigits = [...digits]; nextDigits[index - 1] = ""; updateDigits(nextDigits, index - 1); }
    if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); focusInput(index - 1); }
    if (event.key === "ArrowRight" && index < digits.length - 1) { event.preventDefault(); focusInput(index + 1); }
  }

  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, digits.length - index).split("");
    if (pastedDigits.length === 0) return;
    event.preventDefault();
    const nextDigits = [...digits];
    pastedDigits.forEach((digit, pastedIndex) => { nextDigits[index + pastedIndex] = digit; });
    updateDigits(nextDigits, Math.min(index + pastedDigits.length, digits.length - 1));
  }

  async function onSubmit(formData: FormData) {
    if (code.length !== 4) { onFeedbackChange({ kind: "error", title: "Enter the complete code", message: "Enter all four digits from your verification email." }); focusInput(digits.findIndex((digit) => !digit)); return; }
    setPending(true);
    onFeedbackChange(null);
    const result = await signIn("user-verification", { email, code: String(formData.get("code") ?? ""), redirect: false, callbackUrl: "/" });
    setPending(false);
    if (!result?.ok || result.error) { onFeedbackChange({ kind: "error", title: "Incorrect code", message: "The code you entered is invalid or expired. Please try again." }); return; }
    setVerified(true);
    onFeedbackChange({ kind: "success", title: "Email verified!", message: "Your email has been verified successfully." });
    window.setTimeout(() => { router.push("/"); router.refresh(); }, 1500);
  }

  return <div className="space-y-6"><form id="verification-form" action={onSubmit} noValidate><input type="hidden" name="code" value={code} /><div className="flex justify-center gap-2 sm:gap-4">{digits.map((digit, index) => <input key={index} ref={(element) => { inputRefs.current[index] = element; }} value={digit} onChange={(event) => handleChange(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} onPaste={(event) => handlePaste(index, event)} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} aria-label={`Verification code digit ${index + 1}`} disabled={disabled} maxLength={1} className="size-14 rounded-[var(--public-radius)] border border-public-border bg-public-surface text-center font-editorial text-2xl text-public-text outline-none transition focus:border-public-primary focus:ring-3 focus:ring-public-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:size-[4.5rem] sm:text-3xl" />)}</div></form><p className="flex items-center justify-center gap-2 text-sm text-public-muted-text"><ShieldCheck className="size-5 text-[#bd861f]" aria-hidden="true" />This helps us keep your account secure.</p><Button form="verification-form" type="submit" disabled={disabled} className="h-[3.25rem] w-full rounded-[var(--public-radius)] bg-public-primary text-base font-bold text-white hover:bg-public-primary-hover focus-visible:ring-public-primary/30">{pending ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Verifying...</> : "Verify account"}</Button><div className="flex items-center gap-3 text-sm text-public-muted-text"><span className="h-px flex-1 bg-public-border" /><span className="text-[#bd861f]">✦</span><span className="h-px flex-1 bg-public-border" /></div><div><p className="text-sm text-public-muted-text">Didn't receive the code?</p><form action={resendAction} className="mt-1"><input type="hidden" name="email" value={email} /><Button type="submit" variant="link" disabled={resendPending || disabled} className="h-auto p-0 font-semibold text-public-primary hover:text-public-primary-hover">{resendPending ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Sending code...</> : "Resend code"}</Button></form></div><Link href="/signup" className="inline-flex min-h-10 items-center justify-center gap-2 text-sm font-semibold text-public-primary transition-colors hover:text-public-primary-hover focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary"><PencilLine className="size-4" aria-hidden="true" />Change email address</Link><p className="text-sm text-public-muted-text">Having trouble? Check your spam folder or <Link href="/contact" className="font-semibold text-public-primary hover:underline">contact our support</Link>.</p></div>;
}
