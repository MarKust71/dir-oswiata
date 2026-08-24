const WARSAW_TIME_ZONE = 'Europe/Warsaw'

function getTimeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const parts: Record<string, string> = {}
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  )

  return (asUtc - instant.getTime()) / 60_000
}

/**
 * Zamienia wartość pola <input type="datetime-local"> ("YYYY-MM-DDTHH:mm",
 * ewentualnie z sekundami) traktowaną jako czas lokalny Warszawy na dokładny
 * moment w czasie (Date) - z uwzględnieniem czasu letniego/zimowego.
 */
export function parseWarsawLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value
  )
  if (!match) return null

  const [, year, month, day, hour, minute, second = '00'] = match
  const guess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  )

  const offsetMinutes = getTimeZoneOffsetMinutes(
    new Date(guess),
    WARSAW_TIME_ZONE
  )

  return new Date(guess - offsetMinutes * 60_000)
}

/**
 * Formatuje moment w czasie (Date) jako wartość dla <input type="datetime-local">
 * w czasie lokalnym Warszawy.
 */
export function toWarsawLocalDateTimeInputValue(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: WARSAW_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const parts: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
