"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { canManageAccount, canAssignRole } from "@/lib/permissions";
import { AccountStatus, Role } from "@/generated/prisma/enums";

export type AdminActionState = { message?: string; error?: string } | undefined;

async function loadTarget(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true },
  });
}

export async function setAccountStatusAction(
  userId: string,
  nextStatus: typeof AccountStatus.ACTIVE | typeof AccountStatus.DISABLED
): Promise<AdminActionState> {
  const actor = await requireRole([Role.ADMIN, Role.USER]);

  const target = await loadTarget(userId);
  if (!target) return { error: "Nie znaleziono konta." };

  if (!canManageAccount(actor, target)) {
    return { error: "Brak uprawnien do zarzadzania tym kontem." };
  }

  if (
    nextStatus === AccountStatus.ACTIVE &&
    target.status !== AccountStatus.PENDING_APPROVAL &&
    target.status !== AccountStatus.DISABLED
  ) {
    return { error: "Tego konta nie mozna teraz aktywowac." };
  }
  if (nextStatus === AccountStatus.DISABLED && target.status !== AccountStatus.ACTIVE) {
    return { error: "Mozna dezaktywowac tylko aktywne konta." };
  }
  if (target.id === actor.id) {
    return { error: "Nie mozesz zmienic statusu wlasnego konta." };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { status: nextStatus },
  });

  revalidatePath("/dashboard");
  return { message: "Zapisano zmiane statusu konta." };
}

export async function setAccountRoleAction(
  userId: string,
  nextRole: Role
): Promise<AdminActionState> {
  const actor = await requireRole([Role.ADMIN, Role.USER]);

  const target = await loadTarget(userId);
  if (!target) return { error: "Nie znaleziono konta." };

  if (target.id === actor.id) {
    return { error: "Nie mozesz zmienic wlasnej roli." };
  }
  if (!canManageAccount(actor, target)) {
    return { error: "Brak uprawnien do zarzadzania tym kontem." };
  }
  if (!canAssignRole(actor, nextRole)) {
    return { error: "Brak uprawnien do nadania tej roli." };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { role: nextRole },
  });

  revalidatePath("/dashboard");
  return { message: "Zapisano zmiane roli." };
}
