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

const warsawTimestampFormatter = new Intl.DateTimeFormat('pl-PL', {
  timeZone: WARSAW_TIME_ZONE,
  dateStyle: 'short',
  timeStyle: 'short',
})

/**
 * Formatuje moment w czasie jako datę i godzinę czasu lokalnego Warszawy
 * (np. "27.08.2026, 14:35") - do użytku w treściach powiadomień e-mail,
 * żeby nie pokazywały czasu UTC serwera.
 */
export function formatWarsawTimestamp(date: Date): string {
  return warsawTimestampFormatter.format(date)
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const minutes = String(abs % 60).padStart(2, '0')

  return `${sign}${hours}:${minutes}`
}

/**
 * Formatuje moment w czasie (Date) jako pełny ISO-8601 z jawnym przesunięciem
 * strefy warszawskiej (np. "2026-08-31T07:00:00+02:00") zamiast czasu UTC
 * ("Z") - żeby wartość w bazie danych czytało się wprost jako czas lokalny,
 * mimo że to wciąż dokładnie ten sam moment w czasie.
 */
export function toWarsawOffsetISOString(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: WARSAW_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const parts: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }

  const offsetMinutes = getTimeZoneOffsetMinutes(date, WARSAW_TIME_ZONE)

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${formatOffset(offsetMinutes)}`
}
