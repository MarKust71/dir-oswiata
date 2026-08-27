'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { AccountStatus } from '@/generated/prisma/enums'
import { statusLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'

import { ALL_STATUSES } from './statuses'

export function StatusFilter({
  initialStatuses,
}: {
  initialStatuses: AccountStatus[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedStatuses, setSelectedStatuses] = useState(initialStatuses)
  // Śledzi ostatnio wybrane statusy synchronicznie, żeby kolejne szybkie
  // kliknięcia liczyły się od aktualnego stanu, a nie od tego sprzed
  // zakończenia nawigacji.
  const selectedStatusesRef = useRef(initialStatuses)

  function toggleStatus(status: AccountStatus) {
    const prev = selectedStatusesRef.current
    const next = prev.includes(status)
      ? prev.filter((s) => s !== status)
      : [...prev, status]

    selectedStatusesRef.current = next
    setSelectedStatuses(next)

    const params = new URLSearchParams(searchParams)
    params.set('status', next.join(','))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Status:</span>
      {ALL_STATUSES.map((status) => {
        const active = selectedStatuses.includes(status)

        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => toggleStatus(status)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {statusLabels[status]}
          </button>
        )
      })}
    </div>
  )
}
