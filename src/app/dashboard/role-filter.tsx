'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Role } from '@/generated/prisma/enums'
import { roleLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'

import { ALL_ROLES } from './roles'

export function RoleFilter({ initialRoles }: { initialRoles: Role[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedRoles, setSelectedRoles] = useState(initialRoles)
  // Śledzi ostatnio wybrane role synchronicznie, żeby kolejne szybkie kliknięcia
  // liczyły się od aktualnego stanu, a nie od tego sprzed zakończenia nawigacji.
  const selectedRolesRef = useRef(initialRoles)

  function toggleRole(role: Role) {
    const prev = selectedRolesRef.current
    const next = prev.includes(role)
      ? prev.filter((r) => r !== role)
      : [...prev, role]

    selectedRolesRef.current = next
    setSelectedRoles(next)

    const params = new URLSearchParams(searchParams)
    params.set('role', next.join(','))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Rola:</span>
      {ALL_ROLES.map((role) => {
        const active = selectedRoles.includes(role)

        return (
          <button
            key={role}
            type="button"
            aria-pressed={active}
            onClick={() => toggleRole(role)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {roleLabels[role]}
          </button>
        )
      })}
    </div>
  )
}
