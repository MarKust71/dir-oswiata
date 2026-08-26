'use client'

import { useState } from 'react'

import { ResultDetailsButton } from '@/components/result-details'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'

export type ResultRow = {
  id: string
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

// Klucz do wyszukiwania - nazwisko i imię połączone bez spacji, żeby np.
// "kowalskijan" pasowało do "Kowalski Jan".
function searchKey(result: { firstName: string; lastName: string }) {
  return `${result.lastName}${result.firstName}`
    .replace(/\s+/g, '')
    .toLowerCase()
}

export function ResultsTable({ results }: { results: ResultRow[] }) {
  const [query, setQuery] = useState('')

  const normalizedQuery = query.replace(/\s+/g, '').toLowerCase()
  const filteredResults = normalizedQuery
    ? results.filter((result) => searchKey(result).includes(normalizedQuery))
    : results

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        placeholder="Szukaj po nazwisku i imieniu…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-sm"
      />

      {/* Desktop: tabela */}
      <Card className="hidden md:block">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwisko i imię</TableHead>
                <TableHead>PESEL</TableHead>
                <TableHead>Zawód</TableHead>
                <TableHead>Nr wniosku</TableHead>
                <TableHead>Wynik</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-medium">
                    {result.lastName} {result.firstName}
                  </TableCell>
                  <TableCell className="font-mono">{result.pesel}</TableCell>
                  <TableCell>{result.profession}</TableCell>
                  <TableCell>{result.applicationNumber}</TableCell>
                  <TableCell>
                    <ResultDetailsButton
                      label={result.finalScore > 2 ? 'POZYTYWNY' : 'NEGATYWNY'}
                      positive={result.finalScore > 2}
                      result={result}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile: karty */}
      <div className="flex flex-col gap-3 md:hidden">
        {filteredResults.map((result) => (
          <Card key={result.id}>
            <CardHeader>
              <CardTitle className="text-sm">
                {result.lastName} {result.firstName}
              </CardTitle>
              <CardDescription className="font-mono">
                {result.pesel}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Zawód</span>
                  <span className="text-right font-medium">
                    {result.profession}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Nr wniosku</span>
                  <span className="text-right font-medium">
                    {result.applicationNumber}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Wynik</span>
                  <ResultDetailsButton
                    label={result.finalScore > 2 ? 'POZYTYWNY' : 'NEGATYWNY'}
                    positive={result.finalScore > 2}
                    result={result}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
