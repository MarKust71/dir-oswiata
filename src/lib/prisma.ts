import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Limit puli połączeń per instancja - w produkcji (Vercel) każda "zimna"
// instancja funkcji serverless tworzy własną, nieudostępnianą pulę (patrz
// warunek NODE_ENV poniżej), więc przy wielu równoległych cold startach
// domyślne max=10 pg.Pool na instancję potrafi zbiorowo wyczerpać
// max_connections=100 na współdzielonym, samodzielnie hostowanym Postgresie.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 5,
})

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
