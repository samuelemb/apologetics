"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";
import { eventFormSchema } from "@/schemas/event";
import {
  createEvent,
  deleteEvent,
  EventServiceError,
  updateEvent,
} from "@/services/event.service";
import type { EventDeleteResult, EventMutationResult } from "@/types/event";

const eventIdSchema = z.string().trim().min(1).max(64);

function mapServiceError(error: unknown): EventMutationResult {
  if (error instanceof EventServiceError) {
    return {
      ok: false,
      message: error.message,
      ...(error.field ? { fieldErrors: { [error.field]: [error.message] } } : {}),
    };
  }

  return {
    ok: false,
    message: "The event could not be saved. Please try again.",
  };
}

export async function createEventAction(input: unknown): Promise<EventMutationResult> {
  const user = await requireAdmin();
  const parsed = eventFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const event = await createEvent(
      { id: user.id, role: user.role },
      parsed.data,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/events");
    return { ok: true, id: event.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function updateEventAction(
  id: string,
  input: unknown,
): Promise<EventMutationResult> {
  const user = await requireAdmin();
  const parsedId = eventIdSchema.safeParse(id);
  const parsed = eventFormSchema.safeParse(input);

  if (!parsedId.success) {
    return { ok: false, message: "Event not found." };
  }
  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const event = await updateEvent(
      { id: user.id, role: user.role },
      parsedId.data,
      parsed.data,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${event.id}/edit`);
    return { ok: true, id: event.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function deleteEventAction(id: string): Promise<EventDeleteResult> {
  const user = await requireAdmin();
  const parsedId = eventIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: "Event not found." };
  }

  try {
    await deleteEvent({ id: user.id, role: user.role }, parsedId.data);
    revalidatePath("/admin");
    revalidatePath("/admin/events");
    return { ok: true };
  } catch (error) {
    if (error instanceof EventServiceError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: "The event could not be deleted. Please try again.",
    };
  }
}
