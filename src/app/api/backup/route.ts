import { NextResponse } from 'next/server'

import packageJson from '../../../../package.json'
import { requireRole } from '@/lib/dal'
import { createDatabaseBackup } from '@/lib/db-backup'
import { toWarsawLocalDateTimeInputValue } from '@/lib/warsaw-time'
import { Role } from '@/generated/prisma/enums'

export async function GET() {
  await requireRole([Role.ADMIN])

  const backup = await createDatabaseBackup()
  const timestamp = toWarsawLocalDateTimeInputValue(new Date()).replace(
    /[:T]/g,
    '-'
  )

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="dir-oswiata-backup-v${packageJson.version}-${timestamp}.json"`,
    },
  })
}
