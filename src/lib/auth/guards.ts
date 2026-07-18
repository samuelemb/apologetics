import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/auth";
import type { UserRole } from "@/generated/prisma/enums";
import { isLoginEligible } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export class AuthorizationError extends Error {
  constructor() {
    super("You do not have permission to access this resource.");
    this.name = "AuthorizationError";
  }
}

export async function getCurrentAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
    },
  });

  return user && isLoginEligible(user.status, user.role) ? user : null;
}

export async function requireAdmin() {
  const user = await getCurrentAdmin();

  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function requireRoles(...roles: UserRole[]) {
  const user = await requireAdmin();

  if (!roles.includes(user.role)) {
    throw new AuthorizationError();
  }

  return user;
}
