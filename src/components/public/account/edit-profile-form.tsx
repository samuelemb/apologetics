"use client";

import { Camera, Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useRef, useState } from "react";

import { updatePublicProfileAction } from "@/app/(public)/account-actions";
import { MemberAvatar } from "@/components/public/authenticated-member-menu";
import { Button } from "@/components/ui/button";
import { initialPublicAccountActionState } from "@/lib/public-account-action-state";
import { useUploadThing } from "@/lib/uploadthing";

type EditProfileFormProps = {
  member: {
    name: string;
    email: string;
    image: string | null;
    username: string | null;
    bio: string | null;
    location: string | null;
    timezone: string | null;
    emailVerifiedAt: Date | null;
  };
};

const timezones = ["Africa/Addis_Ababa", "Africa/Nairobi", "Africa/Cairo", "Europe/London", "America/New_York", "Asia/Dubai", "UTC"];

export function EditProfileForm({ member }: EditProfileFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(member.image);
  const [bio, setBio] = useState(member.bio ?? "");
  const [uploadError, setUploadError] = useState<string>();
  const { update } = useSession();
  const [state, formAction, pending] = useActionState(updatePublicProfileAction, initialPublicAccountActionState);
  const { startUpload, isUploading } = useUploadThing("profileAvatar", {
    onClientUploadComplete: (files) => {
      const result = files[0]?.serverData;
      if (!result?.asset) {
        setUploadError(result?.error ?? "The image could not be uploaded.");
        return;
      }
      setImage(result.asset.url);
      setUploadError(undefined);
    },
    onUploadError: () => setUploadError("The image could not be uploaded. Please try again."),
  });

  useEffect(() => {
    if (state.status === "success") {
      void update({ name: state.email ?? member.name, image });
    }
  }, [image, member.name, state.email, state.status, update]);

  async function uploadPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Only JPG, PNG, and WEBP images are allowed.");
    } else if (file.size > 2 * 1024 * 1024) {
      setUploadError("Profile pictures must be 2 MB or smaller.");
    } else {
      setUploadError(undefined);
      await startUpload([file]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="image" value={image ?? ""} />
      <section className="grid gap-8 rounded-[var(--public-radius)] border border-public-border bg-public-surface p-5 shadow-[var(--public-shadow)] md:grid-cols-[12rem_minmax(0,1fr)] md:p-7">
        <div className="border-b border-public-border pb-6 text-center md:border-b-0 md:border-r md:pb-0 md:pr-7">
          <h2 className="text-left font-editorial text-lg font-bold text-public-text">Profile Picture</h2>
          <div className="relative mx-auto mt-5 w-fit"><MemberAvatar name={member.name} image={image} className="size-28 text-4xl" /><button type="button" onClick={() => inputRef.current?.click()} className="absolute -bottom-1 -right-1 inline-flex size-10 items-center justify-center rounded-full bg-public-primary text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary" aria-label="Change profile picture"><Camera className="size-4" aria-hidden="true" /></button></div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadPhoto(event.target.files)} disabled={pending || isUploading} />
          <p className="mt-4 text-xs leading-5 text-public-muted-text">JPG, PNG or WEBP. Max 2 MB.</p>
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={pending || isUploading} className="mt-4 w-full border-public-primary/60 text-public-primary hover:bg-public-primary-soft">{isUploading ? <><LoaderCircle className="animate-spin" />Uploading...</> : "Change Photo"}</Button>
          {image ? <button type="button" onClick={() => setImage(null)} disabled={pending || isUploading} className="mt-3 text-sm font-semibold text-public-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary">Remove Photo</button> : null}
          {uploadError ? <p role="alert" className="mt-3 text-sm text-red-700">{uploadError}</p> : null}
        </div>

        <div className="space-y-4">
          <h2 className="font-editorial text-lg font-bold text-public-text">Personal Information</h2>
          <Field label="Full Name" id="name"><input id="name" name="name" defaultValue={member.name} autoComplete="name" required maxLength={80} className="profile-input" /></Field>
          <Field label="Username" id="username"><input id="username" name="username" defaultValue={member.username ?? ""} autoComplete="username" maxLength={30} pattern="[a-z0-9_-]{3,30}" className="profile-input" /><p className="mt-1 text-xs text-public-muted-text">Lowercase letters, numbers, hyphens, and underscores.</p></Field>
          <Field label="Email Address" id="email"><div className="relative"><input id="email" value={member.email} readOnly aria-readonly="true" className="profile-input pr-24 text-public-muted-text" />{member.emailVerifiedAt ? <span className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800"><Check className="size-3" aria-hidden="true" />Verified</span> : <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-public-muted-text">Unverified</span>}</div><p className="mt-1 text-xs text-public-muted-text">Your email address cannot be changed here.</p></Field>
          <Field label="Bio" id="bio"><textarea id="bio" name="bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={4} placeholder="Share a short introduction about yourself." className="profile-input resize-y" /><p className="text-right text-xs text-public-muted-text">{bio.length}/160</p></Field>
        </div>
      </section>

      <section className="rounded-[var(--public-radius)] border border-public-border bg-public-surface p-5 shadow-[var(--public-shadow)] sm:p-7">
        <h2 className="font-editorial text-lg font-bold text-public-text">Additional Information</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Location" id="location"><input id="location" name="location" defaultValue={member.location ?? ""} maxLength={100} autoComplete="address-level2" className="profile-input" /></Field>
          <Field label="Timezone" id="timezone"><select id="timezone" name="timezone" defaultValue={member.timezone ?? ""} className="profile-input"><option value="">Select a timezone</option>{timezones.map((timezone) => <option key={timezone} value={timezone}>{timezone.replace("_", " ")}</option>)}</select></Field>
        </div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <Link href="/account" className="inline-flex min-h-11 items-center justify-center rounded-[var(--public-radius)] border border-public-border px-5 text-sm font-bold text-public-text hover:bg-public-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary">Cancel</Link>
          <Button type="submit" disabled={pending || isUploading} className="min-h-11 bg-public-primary text-white hover:bg-public-primary-hover">{pending ? <><LoaderCircle className="animate-spin" />Saving...</> : "Save Changes"}</Button>
        </div>
        <div className="mt-4" aria-live="polite">{state.status === "success" ? <p role="status" className="text-sm font-medium text-green-700">{state.message}</p> : null}{state.status === "error" ? <p role="alert" className="text-sm font-medium text-red-700">{state.message}</p> : null}</div>
      </section>
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-public-text">{label}</label>{children}</div>;
}
