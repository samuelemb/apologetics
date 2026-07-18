import type { UserRole } from "@/generated/prisma/enums";

export type ContactMessageActor = {
  id: string;
  role: UserRole;
};

export type ContactMessageActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type ContactMessageNotesResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };
