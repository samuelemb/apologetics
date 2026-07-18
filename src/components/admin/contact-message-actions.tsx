"use client";

import {
  Archive,
  LoaderCircle,
  MailOpen,
  Reply,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  archiveMessageAction,
  deleteMessageAction,
  markMessageReadAction,
  markMessageRepliedAction,
  markMessageSpamAction,
  restoreMessageAction,
} from "@/app/admin/(protected)/messages/actions";
import { Button } from "@/components/ui/button";
import { ContactMessageStatus } from "@/generated/prisma/enums";

type MessageAction = "read" | "replied" | "archive" | "spam" | "restore";

type ContactMessageActionsProps = {
  id: string;
  status: ContactMessageStatus;
  deleteConfirmation?: {
    name: string;
    email: string;
    subject: string | null;
  };
  compact?: boolean;
};

const actionHandlers = {
  read: markMessageReadAction,
  replied: markMessageRepliedAction,
  archive: archiveMessageAction,
  spam: markMessageSpamAction,
  restore: restoreMessageAction,
} satisfies Record<MessageAction, (id: string) => Promise<{ ok: boolean; message?: string }>>;

export function ContactMessageActions({
  id,
  status,
  deleteConfirmation,
  compact = false,
}: ContactMessageActionsProps) {
  const [pending, setPending] = useState<MessageAction | "delete">();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string>();

  async function runAction(action: MessageAction) {
    setPending(action);
    setError(undefined);
    const result = await actionHandlers[action](id);
    setPending(undefined);
    if (!result.ok) {
      setError(result.message ?? "The message could not be updated.");
      return;
    }
    window.location.reload();
  }

  async function permanentlyDelete() {
    setPending("delete");
    setError(undefined);
    const result = await deleteMessageAction(id);
    setPending(undefined);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    window.location.assign("/admin/messages");
  }

  const showRead = !compact && status === ContactMessageStatus.NEW;
  const showReplied =
    !compact &&
    (status === ContactMessageStatus.NEW || status === ContactMessageStatus.READ);
  const showRestore =
    !compact &&
    (status === ContactMessageStatus.ARCHIVED ||
      status === ContactMessageStatus.SPAM);
  const showArchive = status !== ContactMessageStatus.ARCHIVED;
  const showSpam = status !== ContactMessageStatus.SPAM;
  const buttonSize = compact ? "sm" : "default";

  return (
    <>
      {showRead && (
        <Button type="button" variant="outline" size={buttonSize} className="h-10 rounded-md" disabled={Boolean(pending)} onClick={() => runAction("read")}>
          {pending === "read" ? <LoaderCircle className="animate-spin" /> : <MailOpen />}
          Mark as read
        </Button>
      )}
      {showReplied && (
        <Button type="button" variant="outline" size={buttonSize} className="h-10 rounded-md" disabled={Boolean(pending)} onClick={() => runAction("replied")}>
          {pending === "replied" ? <LoaderCircle className="animate-spin" /> : <Reply />}
          Mark replied
        </Button>
      )}
      {showRestore && (
        <Button type="button" variant="outline" size={buttonSize} className="h-10 rounded-md" disabled={Boolean(pending)} onClick={() => runAction("restore")}>
          {pending === "restore" ? <LoaderCircle className="animate-spin" /> : <RotateCcw />}
          Restore
        </Button>
      )}
      {showArchive && (
        <Button type="button" variant="outline" size={buttonSize} className="h-10 rounded-md" disabled={Boolean(pending)} onClick={() => runAction("archive")}>
          {pending === "archive" ? <LoaderCircle className="animate-spin" /> : <Archive />}
          Archive
        </Button>
      )}
      {showSpam && (
        <Button type="button" variant="outline" size={buttonSize} className="h-10 rounded-md" disabled={Boolean(pending)} onClick={() => runAction("spam")}>
          {pending === "spam" ? <LoaderCircle className="animate-spin" /> : <ShieldAlert />}
          Spam
        </Button>
      )}
      {deleteConfirmation && (
        <Button type="button" variant="destructive" size={buttonSize} className="h-10 rounded-md" disabled={Boolean(pending)} onClick={() => { setError(undefined); setConfirmDelete(true); }}>
          <Trash2 />
          Delete
        </Button>
      )}
      {error && !confirmDelete && (
        <p className="w-full text-sm text-destructive" role="alert">{error}</p>
      )}

      {confirmDelete && deleteConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) {
              setConfirmDelete(false);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`message-delete-title-${id}`}
            aria-describedby={`message-delete-description-${id}`}
            className="w-full max-w-lg rounded-md border bg-background p-5 shadow-xl"
          >
            <h2 id={`message-delete-title-${id}`} className="text-lg font-semibold">
              Delete contact message permanently
            </h2>
            <div id={`message-delete-description-${id}`} className="mt-2 space-y-3 text-sm text-muted-foreground">
              <p>This cannot be undone. Only this contact message will be deleted.</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="font-medium text-foreground">Sender</dt><dd className="break-words">{deleteConfirmation.name}</dd>
                <dt className="font-medium text-foreground">Email</dt><dd className="break-all">{deleteConfirmation.email}</dd>
                <dt className="font-medium text-foreground">Subject</dt><dd className="break-words">{deleteConfirmation.subject || "(No subject)"}</dd>
              </dl>
            </div>
            {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={Boolean(pending)} onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" disabled={Boolean(pending)} onClick={permanentlyDelete}>
                {pending === "delete" ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                {pending === "delete" ? "Deleting..." : "Delete permanently"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
