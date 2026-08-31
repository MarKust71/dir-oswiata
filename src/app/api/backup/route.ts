import { NextResponse } from 'next/server'

import packageJson from '../../../../package.json'
import { requireRole } from '@/lib/dal'
import { createDatabaseBackup } from '@/lib/db-backup'
import { toWarsawLocalDateTimeInputValue } from '@/lib/warsaw-time'
import { getClientRequestInfo } from '@/lib/request-info'
import { logEvent } from '@/lib/event-log'
import { EventType, Role } from '@/generated/prisma/enums'

export async function GET() {
  const actor = await requireRole([Role.ADMIN])

  const backup = await createDatabaseBackup()

  const { ip, userAgent } = await getClientRequestInfo()
  await logEvent({
    type: EventType.DB_BACKUP_CREATED,
    message: `Pobrano kopię zapasową bazy danych (${actor.email}).`,
    actorEmail: actor.email,
    actorUserId: actor.id,
    ip,
    userAgent,
  })

  const timestamp = toWarsawLocalDateTimeInputValue(new Date()).replace(
    /[:T]/g,
    '-'
  )
  // next build/start (w tym wdrożenie na Vercel) zawsze ustawia NODE_ENV=production -
  // rozróżnienie dev/prod odpowiada więc lokalnemu `next dev` vs zbudowanej aplikacji.
  const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev'

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="dir-oswiata-backup-${env}-v${packageJson.version}-${timestamp}.json"`,
    },
  })
}
