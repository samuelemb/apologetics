import type { UserRole } from "@/generated/prisma/enums";

export type TagActor = { id: string; role: UserRole };

export type TagMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export type TagActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type TagEditValues = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
};
