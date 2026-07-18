"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCheck, LoaderCircle, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { updateMessageNotesAction } from "@/app/admin/(protected)/messages/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  contactMessageNotesSchema,
  type ContactMessageNotesInput,
} from "@/schemas/contact-message";

export function ContactMessageNotesForm({
  id,
  initialNotes,
}: {
  id: string;
  initialNotes: string;
}) {
  const [formError, setFormError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactMessageNotesInput>({
    resolver: zodResolver(contactMessageNotesSchema),
    defaultValues: { adminNotes: initialNotes },
  });

  async function onSubmit(values: ContactMessageNotesInput) {
    setFormError(undefined);
    setSaved(false);
    const result = await updateMessageNotesAction(id, values);
    if (!result.ok) {
      setFormError(result.message);
      const fieldMessage = result.fieldErrors?.adminNotes?.[0];
      if (fieldMessage) setError("adminNotes", { message: fieldMessage });
      return;
    }
    setSaved(true);
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="adminNotes" className="text-sm font-medium">
        Internal notes
      </label>
      <Textarea
        id="adminNotes"
        rows={8}
        placeholder="Add private notes for administrators"
        aria-invalid={Boolean(errors.adminNotes)}
        aria-describedby={errors.adminNotes ? "admin-notes-error" : undefined}
        {...register("adminNotes")}
      />
      {errors.adminNotes?.message && (
        <p id="admin-notes-error" className="text-sm text-destructive">
          {errors.adminNotes.message}
        </p>
      )}
      {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}
      {saved && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <CheckCheck className="size-4" />
          Notes saved.
        </p>
      )}
      <Button type="submit" className="h-10 rounded-md" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Save />}
        {isSubmitting ? "Saving..." : "Save notes"}
      </Button>
    </form>
  );
}
