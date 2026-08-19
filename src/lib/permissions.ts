import { Role } from "@/generated/prisma/enums";

type ActorLike = { role: Role };
type TargetLike = { role: Role };

/** Czy actor moze zarzadzac (zmieniac status) konta target. */
export function canManageAccount(actor: ActorLike, target: TargetLike): boolean {
  if (target.role === Role.ADMIN && actor.role !== Role.ADMIN) {
    return false;
  }
  return true;
}

/** Czy actor moze nadac uzytkownikowi podana role. */
export function canAssignRole(actor: ActorLike, role: Role): boolean {
  if (role === Role.ADMIN && actor.role !== Role.ADMIN) {
    return false;
  }
  return true;
}
