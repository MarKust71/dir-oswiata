'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type ResultDetails = {
  firstName: string
  lastName: string
  pesel: string
  practicalScore: number
  theoryScore: number
  finalScore: number
  oralScore: number
  writtenScore: number
  profession: string
  applicationNumber: string
}

function DetailRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

export function ResultDetailsButton({
  label,
  positive,
  result,
}: {
  label: string
  positive: boolean
  result: ResultDetails
}) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          'text-sm font-medium underline-offset-2 hover:underline',
          positive ? 'text-green-600 dark:text-green-400' : 'text-destructive'
        )}
      >
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Szczegóły wyniku egzaminu</DialogTitle>
          <DialogDescription>
            <span className="block">
              {result.lastName}, {result.firstName}
            </span>
            <span className="block font-mono">{result.pesel}</span>
            <span className="block">
              {result.profession} · nr wniosku {result.applicationNumber}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col text-sm">
          <DetailRow label="Wynik praktyczny" value={result.practicalScore} />
          <DetailRow label="Wynik teoretyczny" value={result.theoryScore} />
          <DetailRow label="Wynik końcowy" value={result.finalScore} />
          <DetailRow label="Ocena ustna" value={result.oralScore} />
          <DetailRow label="Ocena pisemna" value={result.writtenScore} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
