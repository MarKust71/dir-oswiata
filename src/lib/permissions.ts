import { Role } from '@/generated/prisma/enums'

type ActorLike = { role: Role }
type TargetLike = { role: Role }

/** Czy actor może zarządzać (zmieniać status) konta target. */
export function canManageAccount(
  actor: ActorLike,
  target: TargetLike
): boolean {
  return !(target.role === Role.ADMIN && actor.role !== Role.ADMIN)
}

/** Czy actor może nadać użytkownikowi podaną rolę. */
export function canAssignRole(actor: ActorLike, role: Role): boolean {
  return !(role === Role.ADMIN && actor.role !== Role.ADMIN)
}
