// Tworzy (lub podnosi do roli ADMIN i aktywuje) konto administratora bezposrednio
// w bazie danych, z pominieciem calego procesu rejestracji/weryfikacji e-mail.
//
// Uzycie:
//   DATABASE_URL="postgresql://..." node scripts/create-admin.mjs <email> <haslo>
//
// Celowo NIE korzysta z .env.local - zeby latwo mozna bylo wskazac dowolna baze
// (np. produkcyjna) przez zmienna srodowiskowa w linii polecen, bez ryzyka
// pomylkowego uzycia lokalnego DATABASE_URL.

import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const [, , email, password] = process.argv

if (!email || !password || !process.env.DATABASE_URL) {
  console.error(
    'Uzycie: DATABASE_URL="postgresql://..." node scripts/create-admin.mjs <email> <haslo>'
  )
  process.exit(1)
}

if (password.length < 8) {
  console.error('Haslo musi miec co najmniej 8 znakow.')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const passwordHash = await bcrypt.hash(password, 12)
const id = crypto.randomUUID()

await client.query(
  `INSERT INTO "User" (id, email, "passwordHash", role, status, "emailVerifiedAt", "createdAt", "updatedAt")
   VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE', now(), now(), now())
   ON CONFLICT (email) DO UPDATE
   SET role = 'ADMIN', status = 'ACTIVE', "passwordHash" = $3, "updatedAt" = now()`,
  [id, email.trim().toLowerCase(), passwordHash]
)

console.log(`Konto administratora gotowe: ${email}`)
await client.end()
