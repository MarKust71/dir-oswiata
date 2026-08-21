export const PESEL_LENGTH = 11
export const PESEL_REVEAL_COUNT = 3

/** Losuje `PESEL_REVEAL_COUNT` unikalnych pozycji (0-indeksowanych) z numeru PESEL. */
export function pickRandomPeselPositions(): number[] {
  const positions = new Set<number>()

  while (positions.size < PESEL_REVEAL_COUNT) {
    positions.add(Math.floor(Math.random() * PESEL_LENGTH))
  }

  return [...positions].sort((a, b) => a - b)
}

/** Buduje 11-znakową maskę PESEL: podane cyfry na swoich pozycjach, reszta jako "•". */
export function maskPesel(positions: number[], digits: string[]): string[] {
  const cells = Array.from({ length: PESEL_LENGTH }, () => '•')

  positions.forEach((pos, i) => {
    if (pos >= 0 && pos < PESEL_LENGTH) {
      cells[pos] = digits[i] ?? '•'
    }
  })

  return cells
}
