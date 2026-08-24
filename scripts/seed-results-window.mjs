// Ustawia w tabeli "Settings" granice okresu udostępnienia wyników egzaminu
// studentom (klucze results_visible_from / results_visible_until).
//
// Uzycie:
//   DATABASE_URL="postgresql://..." node scripts/seed-results-window.mjs
//
// Celowo NIE korzysta z .env.local - zeby latwo mozna bylo wskazac dowolna baze
// (np. produkcyjna) przez zmienna srodowiskowa w linii polecen, bez ryzyka
// pomylkowego uzycia lokalnego DATABASE_URL.

import pg from 'pg'

if (!process.env.DATABASE_URL) {
  console.error(
    'Uzycie: DATABASE_URL="postgresql://..." node scripts/seed-results-window.mjs'
  )
  process.exit(1)
}

const RESULTS_VISIBLE_FROM = '2026-08-31T07:00:00+02:00'
const RESULTS_VISIBLE_UNTIL = '2026-09-07T23:59:59+02:00'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

await client.query(
  `INSERT INTO "Settings" (key, value) VALUES ($1, $2), ($3, $4)
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
  [
    'results_visible_from',
    RESULTS_VISIBLE_FROM,
    'results_visible_until',
    RESULTS_VISIBLE_UNTIL,
  ]
)

console.log(
  `Ustawiono okres udostępnienia wyników: ${RESULTS_VISIBLE_FROM} - ${RESULTS_VISIBLE_UNTIL}`
)
await client.end()
