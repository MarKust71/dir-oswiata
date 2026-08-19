import { PESEL_LENGTH, maskPesel } from '@/lib/pesel'

export function PeselBoxes({
  positions,
  digits,
}: {
  positions: number[]
  digits: string[]
}) {
  const cells = maskPesel(positions, digits)

  return (
    <div className="flex flex-nowrap gap-0.5 sm:gap-1">
      {Array.from({ length: PESEL_LENGTH }, (_, i) => {
        const isRevealed = positions.includes(i)

        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-muted-foreground">{i + 1}</span>
            <div
              className={
                'flex h-9 w-6 items-center justify-center rounded-lg border border-input font-mono tabular-nums ' +
                (isRevealed
                  ? 'bg-background font-medium'
                  : 'bg-input/30 text-muted-foreground')
              }
            >
              {cells[i]}
            </div>
          </div>
        )
      })}
    </div>
  )
}
