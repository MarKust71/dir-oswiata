import 'server-only'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { EventType } from '@/generated/prisma/enums'

/**
 * Zapisuje zdarzenie do trwałego dziennika (EventLog) - niezależnego od
 * dostarczalności e-maili i od ulotnych logów serwera. Błąd zapisu nie może
 * przerwać akcji, która go wywołała, więc jest tylko logowany do konsoli.
 */
export async function logEvent(params: {
  type: EventType
  message: string
  actorEmail?: string | null
  actorUserId?: string | null
  targetEmail?: string | null
  targetUserId?: string | null
  ip?: string | null
  userAgent?: string | null
  metadata?: Prisma.InputJsonValue
}) {
  try {
    await prisma.eventLog.create({
      data: {
        type: params.type,
        message: params.message,
        actorEmail: params.actorEmail ?? null,
        actorUserId: params.actorUserId ?? null,
        targetEmail: params.targetEmail ?? null,
        targetUserId: params.targetUserId ?? null,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata,
      },
    })
  } catch (error) {
    console.error('[event-log] Nie udało się zapisać zdarzenia:', error)
  }
}

/**
 * Usuwa wpisy dziennika starsze niż `retentionDays` - wywoływane przy
 * wizycie na stronie dziennika (src/app/logs/page.tsx), a nie przy
 * każdym zapisie zdarzenia, żeby nie obciążać każdej pojedynczej akcji.
 */
export async function cleanupExpiredEvents(retentionDays: number) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

  await prisma.eventLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
}
