import { ArrowLeft, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  AdminPageHeader,
  AdminStatusBadge,
} from "@/components/admin/admin-listing";
import { ContactMessageActions } from "@/components/admin/contact-message-actions";
import { ContactMessageNotesForm } from "@/components/admin/contact-message-notes-form";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import {
  canAccessContactMessageAdmin,
  canDeleteContactMessage,
} from "@/lib/contact-message-policy";
import { cn } from "@/lib/utils";
import { contactMessageIdSchema } from "@/schemas/contact-message";
import { getContactMessage } from "@/services/contact-message.service";

function formatDateTime(value: Date | null): string {
  return value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(value)
    : "Not yet";
}

function mailtoHref(email: string, subject: string | null): string {
  const replySubject = subject ? `Re: ${subject}` : "Re: Your contact message";
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(replySubject)}`;
}

function decodeRouteSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function MetadataItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-admin-muted-text">{label}</p>
      <div className="mt-1.5 break-words text-sm text-admin-text">{children}</div>
    </div>
  );
}

export default async function ContactMessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdmin();
  if (!canAccessContactMessageAdmin(actor.role)) {
    redirect("/admin?error=forbidden");
  }

  const { id: rawId } = await params;
  const parsedId = contactMessageIdSchema.safeParse(decodeRouteSegment(rawId));
  if (!parsedId.success) notFound();

  const message = await getContactMessage(
    { id: actor.id, role: actor.role },
    parsedId.data,
  );
  if (!message) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link href="/admin/messages" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "-ml-3 h-10 text-admin-muted-text")}>
        <ArrowLeft aria-hidden="true" />
        Back to messages
      </Link>

      <AdminPageHeader
        title={message.subject || "Contact message"}
        description={`Received ${formatDateTime(message.createdAt)}`}
        actions={<AdminStatusBadge status={message.status} />}
      />

      <section className="grid gap-6 rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface p-5 shadow-[var(--admin-shadow)] sm:grid-cols-2 lg:grid-cols-3" aria-label="Message metadata">
        <MetadataItem label="Sender"><span className="font-semibold">{message.name}</span></MetadataItem>
        <MetadataItem label="Email">
          <a className="inline-flex items-center gap-2 break-all font-medium text-admin-info underline underline-offset-4" href={mailtoHref(message.email, message.subject)}>
            <Mail aria-hidden="true" className="size-4 shrink-0" />
            {message.email}
          </a>
        </MetadataItem>
        <MetadataItem label="Phone"><span className="inline-flex items-center gap-2"><Phone aria-hidden="true" className="size-4 shrink-0" />{message.phone || "Not provided"}</span></MetadataItem>
        <MetadataItem label="Last updated">{formatDateTime(message.updatedAt)}</MetadataItem>
        <MetadataItem label="Read">{formatDateTime(message.readAt)}</MetadataItem>
        <MetadataItem label="Replied">{formatDateTime(message.repliedAt)}</MetadataItem>
      </section>

      <section className="rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface p-5 shadow-[var(--admin-shadow)]" aria-labelledby="message-content-title">
        <h2 id="message-content-title" className="text-lg font-semibold text-admin-text">Message</h2>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-admin-text">{message.message}</p>
      </section>

      <section className="rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface p-5 shadow-[var(--admin-shadow)]" aria-labelledby="message-actions-title">
        <h2 id="message-actions-title" className="text-lg font-semibold text-admin-text">Workflow actions</h2>
        <p className="mt-1 text-sm text-admin-muted-text">Marking as replied records an external reply; this application does not send email.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ContactMessageActions
            id={message.id}
            status={message.status}
            deleteConfirmation={
              canDeleteContactMessage(actor.role, message.status)
                ? { name: message.name, email: message.email, subject: message.subject }
                : undefined
            }
          />
        </div>
      </section>

      <section className="rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface p-5 shadow-[var(--admin-shadow)]" aria-labelledby="admin-notes-title">
        <h2 id="admin-notes-title" className="text-lg font-semibold text-admin-text">Admin notes</h2>
        <p className="mt-1 text-sm text-admin-muted-text">Private notes are visible only inside protected administration.</p>
        <div className="mt-4 max-w-3xl">
          <ContactMessageNotesForm id={message.id} initialNotes={message.adminNotes ?? ""} />
        </div>
      </section>
    </div>
  );
}
