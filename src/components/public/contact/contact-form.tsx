"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type ContactFieldName = "name" | "email" | "phone" | "subject" | "message";
type ContactFieldErrors = Partial<Record<ContactFieldName, string>>;

type ContactResponse = {
  success: boolean;
  message: string;
  fieldErrors?: ContactFieldErrors;
};

const inputClasses =
  "mt-2 min-h-11 w-full min-w-0 rounded-[var(--public-radius)] border border-public-border bg-public-surface px-3.5 py-2.5 text-base text-public-text shadow-sm outline-none transition-[background-color,border-color,box-shadow] hover:border-public-primary/35 focus-visible:border-public-primary focus-visible:ring-2 focus-visible:ring-public-primary/20 aria-[invalid=true]:border-public-primary aria-[invalid=true]:bg-public-primary-soft/35 aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-public-primary/15 disabled:cursor-not-allowed disabled:bg-public-primary-soft/20 disabled:opacity-70";

function isContactResponse(value: unknown): value is ContactResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.success === "boolean" && typeof record.message === "string"
  );
}

function getFieldErrors(value: unknown): ContactFieldErrors {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const errors: ContactFieldErrors = {};
  const fieldNames: ContactFieldName[] = [
    "name",
    "email",
    "phone",
    "subject",
    "message",
  ];

  for (const fieldName of fieldNames) {
    if (typeof record[fieldName] === "string") {
      errors[fieldName] = record[fieldName];
    }
  }

  return errors;
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

export function ContactForm() {
  const submissionPendingRef = useRef(false);
  const successRef = useRef<HTMLParagraphElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage) {
      successRef.current?.focus();
    }
  }, [successMessage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionPendingRef.current) {
      return;
    }

    submissionPendingRef.current = true;
    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsPending(true);
    setFieldErrors({});
    setSuccessMessage(null);
    setSubmissionError(null);

    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formValue(formData, "name"),
          email: formValue(formData, "email"),
          phone: formValue(formData, "phone"),
          subject: formValue(formData, "subject"),
          message: formValue(formData, "message"),
          website: formValue(formData, "website"),
        }),
      });
      const responseBody: unknown = await response.json().catch(() => null);

      if (response.ok && isContactResponse(responseBody) && responseBody.success) {
        form.reset();
        setFieldErrors({});
        setSuccessMessage("Thank you. Your message has been received.");
        return;
      }

      if (isContactResponse(responseBody)) {
        if (response.status === 400) {
          setFieldErrors(getFieldErrors(responseBody.fieldErrors));
        }

        setSubmissionError(responseBody.message);
        return;
      }

      setSubmissionError(
        "Your message could not be sent. Please try again later.",
      );
    } catch {
      setSubmissionError(
        "Your message could not be sent. Please try again later.",
      );
    } finally {
      submissionPendingRef.current = false;
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isPending}
      className="min-w-0 space-y-4 sm:space-y-5"
    >
      {successMessage ? (
        <p
          ref={successRef}
          role="status"
          tabIndex={-1}
          className="rounded-[var(--public-radius)] border border-public-primary/25 bg-public-primary-soft px-4 py-3 text-sm font-semibold leading-6 text-public-text shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-public-primary"
        >
          {successMessage}
        </p>
      ) : null}

      {submissionError ? (
        <p
          role="alert"
          className="rounded-[var(--public-radius)] border border-public-primary/30 bg-public-primary-soft px-4 py-3 text-sm leading-6 text-public-primary"
        >
          {submissionError}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="min-w-0">
          <label htmlFor="contact-name" className="text-sm font-semibold leading-5 text-public-text">
            Name
            <span className="ml-1 text-xs font-medium text-public-primary">
              (required)
            </span>
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
            className={inputClasses}
          />
          {fieldErrors.name ? (
            <p id="contact-name-error" className="mt-1.5 break-words text-sm leading-5 text-public-primary">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <label htmlFor="contact-email" className="text-sm font-semibold leading-5 text-public-text">
            Email
            <span className="ml-1 text-xs font-medium text-public-primary">
              (required)
            </span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
            className={inputClasses}
          />
          {fieldErrors.email ? (
            <p id="contact-email-error" className="mt-1.5 break-words text-sm leading-5 text-public-primary">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="min-w-0">
          <label htmlFor="contact-phone" className="text-sm font-semibold leading-5 text-public-text">
            Phone
            <span className="ml-1 text-xs font-normal text-public-muted-text">
              (optional)
            </span>
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "contact-phone-error" : undefined}
            className={inputClasses}
          />
          {fieldErrors.phone ? (
            <p id="contact-phone-error" className="mt-1.5 break-words text-sm leading-5 text-public-primary">
              {fieldErrors.phone}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <label htmlFor="contact-subject" className="text-sm font-semibold leading-5 text-public-text">
            Subject
            <span className="ml-1 text-xs font-normal text-public-muted-text">
              (optional)
            </span>
          </label>
          <input
            id="contact-subject"
            name="subject"
            type="text"
            maxLength={150}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.subject)}
            aria-describedby={fieldErrors.subject ? "contact-subject-error" : undefined}
            className={inputClasses}
          />
          {fieldErrors.subject ? (
            <p id="contact-subject-error" className="mt-1.5 break-words text-sm leading-5 text-public-primary">
              {fieldErrors.subject}
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <label htmlFor="contact-message" className="text-sm font-semibold leading-5 text-public-text">
          Message
          <span className="ml-1 text-xs font-medium text-public-primary">
            (required)
          </span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={20}
          maxLength={5000}
          rows={6}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
          className={`${inputClasses} min-h-40 resize-y`}
        />
        {fieldErrors.message ? (
          <p id="contact-message-error" className="mt-1.5 break-words text-sm leading-5 text-public-primary">
            {fieldErrors.message}
          </p>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-[var(--public-radius)] border border-transparent bg-public-primary px-5 py-2.5 text-sm font-semibold leading-5 text-white shadow-sm transition-colors hover:bg-public-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary disabled:cursor-not-allowed disabled:bg-public-primary-hover disabled:opacity-70"
      >
        <span aria-live="polite">{isPending ? "Sending…" : "Send Message"}</span>
      </button>
    </form>
  );
}
