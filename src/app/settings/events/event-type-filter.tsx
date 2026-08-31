'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { eventTypeLabels } from '@/lib/labels'
import { EventType } from '@/generated/prisma/enums'

const ALL_EVENT_TYPES = Object.values(EventType)

export function EventTypeFilter({
  initialType,
}: {
  initialType: EventType | undefined
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(value: string | null) {
    const params = new URLSearchParams(searchParams)
    if (!value || value === 'all') {
      params.delete('type')
    } else {
      params.set('type', value)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={initialType ?? 'all'} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Wszystkie typy</SelectItem>
        {ALL_EVENT_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {eventTypeLabels[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
