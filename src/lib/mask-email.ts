/**
 * Maskuje adres e-mail do pokazania w komunikatach innym użytkownikom -
 * zostawia pierwsze dwa znaki nazwy użytkownika oraz ostatni znak pierwszego
 * członu domeny, resztę zastępuje gwiazdkami.
 * Np. "jan.kowalski@gmail.com" -> "ja****@****l.com".
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex === -1) return email

  const localPart = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)

  const maskedLocal = `${localPart.slice(0, 2)}****`

  const [firstLabel, ...restLabels] = domain.split('.')
  const maskedFirstLabel = `****${firstLabel.slice(-1)}`

  return `${maskedLocal}@${[maskedFirstLabel, ...restLabels].join('.')}`
}
