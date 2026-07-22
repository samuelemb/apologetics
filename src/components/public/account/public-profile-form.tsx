"use client";

import { useActionState } from "react";

import {
  updatePublicProfileAction,
} from "@/app/(public)/account-actions";
import { initialPublicAccountActionState } from "@/lib/public-account-action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PublicProfileFormProps = {
  name: string;
  email: string;
};

export function PublicProfileForm({ name, email }: PublicProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updatePublicProfileAction,
    initialPublicAccountActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2"><label htmlFor="name" className="text-sm font-semibold text-public-text">Display name</label><Input id="name" name="name" defaultValue={name} autoComplete="name" required /></div>
      <div className="space-y-2"><label htmlFor="email" className="text-sm font-semibold text-public-text">Email address</label><Input id="email" value={email} readOnly aria-readonly="true" className="bg-public-primary-soft text-public-muted-text" /><p className="text-xs text-public-muted-text">Your verified email address cannot be changed here.</p></div>
      {state.status === "error" ? <p role="alert" className="text-sm text-red-700">{state.message}</p> : null}
      {state.status === "success" ? <p role="status" className="text-sm text-green-700">{state.message}</p> : null}
      <Button type="submit" disabled={pending} className="h-11 bg-public-primary text-white hover:bg-public-primary-hover">{pending ? "Saving..." : "Save changes"}</Button>
    </form>
  );
}
