import type { UserRole, UserStatus } from "@/generated/prisma/enums";

export type UserActor = {
  id: string;
  role: UserRole;
};

export type UserMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export type UserActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type UserEditValues = {
  id: string;
  name: string;
  email: string;
  image: string;
  role: UserRole;
  status: UserStatus;
};
