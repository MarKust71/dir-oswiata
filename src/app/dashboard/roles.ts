import { Role } from '@/generated/prisma/enums'

export const ALL_ROLES = [Role.STUDENT, Role.USER, Role.ADMIN] as const

const DEFAULT_ROLES: Role[] = [Role.STUDENT]

export function parseSelectedRoles(
  roleParam: string | string[] | undefined
): Role[] {
  if (roleParam === undefined) return DEFAULT_ROLES

  const raw = Array.isArray(roleParam) ? roleParam : roleParam.split(',')

  return raw.filter((value): value is Role =>
    (ALL_ROLES as readonly string[]).includes(value)
  )
}
