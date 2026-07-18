"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/guards";
import {
  contactMessageIdSchema,
  contactMessageNotesSchema,
} from "@/schemas/contact-message";
import {
  archiveMessage,
  ContactMessageServiceError,
  deleteMessage,
  markMessageRead,
  markMessageReplied,
  markMessageSpam,
  restoreMessage,
  updateMessageNotes,
} from "@/services/contact-message.service";
import type {
  ContactMessageActionResult,
  ContactMessageNotesResult,
} from "@/types/contact-message";

function revalidateMessageRoutes(id?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/messages");
  if (id) revalidatePath(`/admin/messages/${id}`);
}

function safeActionError(
  error: unknown,
  fallback: string,
): ContactMessageActionResult {
  return {
    ok: false,
    message:
      error instanceof ContactMessageServiceError
        ? error.message
        : fallback,
  };
}

async function runStatusAction(
  id: string,
  mutation: (actor: { id: string; role: Awaited<ReturnType<typeof requireAdmin>>["role"] }, id: string) => Promise<void>,
  fallback: string,
): Promise<ContactMessageActionResult> {
  const actor = await requireAdmin();
  const parsedId = contactMessageIdSchema.safeParse(id);
  if (!parsedId.success) {
    return { ok: false, message: "Contact message not found." };
  }

  try {
    await mutation({ id: actor.id, role: actor.role }, parsedId.data);
    revalidateMessageRoutes(parsedId.data);
    return { ok: true };
  } catch (error) {
    return safeActionError(error, fallback);
  }
}

export async function markMessageReadAction(
  id: string,
): Promise<ContactMessageActionResult> {
  return runStatusAction(id, markMessageRead, "The message could not be marked as read.");
}

export async function markMessageRepliedAction(
  id: string,
): Promise<ContactMessageActionResult> {
  return runStatusAction(id, markMessageReplied, "The message could not be marked as replied.");
}

export async function archiveMessageAction(
  id: string,
): Promise<ContactMessageActionResult> {
  return runStatusAction(id, archiveMessage, "The message could not be archived.");
}

export async function markMessageSpamAction(
  id: string,
): Promise<ContactMessageActionResult> {
  return runStatusAction(id, markMessageSpam, "The message could not be marked as spam.");
}

export async function restoreMessageAction(
  id: string,
): Promise<ContactMessageActionResult> {
  return runStatusAction(id, restoreMessage, "The message could not be restored.");
}

export async function updateMessageNotesAction(
  id: string,
  input: unknown,
): Promise<ContactMessageNotesResult> {
  const actor = await requireAdmin();
  const parsedId = contactMessageIdSchema.safeParse(id);
  const parsed = contactMessageNotesSchema.safeParse(input);

  if (!parsedId.success) {
    return { ok: false, message: "Contact message not found." };
  }
  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted field.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateMessageNotes(
      { id: actor.id, role: actor.role },
      parsedId.data,
      parsed.data,
    );
    revalidateMessageRoutes(parsedId.data);
    return { ok: true };
  } catch (error) {
    const result = safeActionError(
      error,
      "The admin notes could not be saved.",
    );
    return result;
  }
}

export async function deleteMessageAction(
  id: string,
): Promise<ContactMessageActionResult> {
  const actor = await requireAdmin();
  const parsedId = contactMessageIdSchema.safeParse(id);
  if (!parsedId.success) {
    return { ok: false, message: "Contact message not found." };
  }

  try {
    await deleteMessage(
      { id: actor.id, role: actor.role },
      parsedId.data,
    );
    revalidateMessageRoutes();
    return { ok: true };
  } catch (error) {
    return safeActionError(
      error,
      "The contact message could not be permanently deleted.",
    );
  }
}
