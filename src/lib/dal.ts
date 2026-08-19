import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Role, AccountStatus } from "@/generated/prisma/enums";

/**
 * Zawsze dociaga swiezy rekord z bazy zamiast ufac payloadowi JWT z ciasteczka -
 * dzieki temu dezaktywacja konta przez admina dziala natychmiast przy kolejnym zadaniu.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!user || user.status !== AccountStatus.ACTIVE) {
    return null;
  }

  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function homePathForRole(role: Role) {
  return role === Role.STUDENT ? "/panel" : "/dashboard";
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(homePathForRole(user.role));
  }
  return user;
}
