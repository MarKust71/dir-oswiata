import { AccountStatus } from '@/generated/prisma/enums'

export const ALL_STATUSES = [
  AccountStatus.PENDING_EMAIL,
  AccountStatus.PENDING_APPROVAL,
  AccountStatus.ACTIVE,
  AccountStatus.DISABLED,
] as const

export function parseSelectedStatuses(
  statusParam: string | string[] | undefined
): AccountStatus[] {
  if (statusParam === undefined) return [...ALL_STATUSES]

  const raw = Array.isArray(statusParam) ? statusParam : statusParam.split(',')

  return raw.filter((value): value is AccountStatus =>
    (ALL_STATUSES as readonly string[]).includes(value)
  )
}
