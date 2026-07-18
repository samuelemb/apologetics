import type { UserRole } from "@/generated/prisma/enums";

export type CategoryActor = { id: string; role: UserRole };

export type CategoryMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export type CategoryActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type CategoryEditValues = {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: import("@/generated/prisma/enums").CategoryType;
  isActive: boolean;
};
