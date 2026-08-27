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
