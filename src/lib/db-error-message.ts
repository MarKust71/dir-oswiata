// Bez 'server-only' i bez importu Prisma - ta stała musi być importowalna
// zarówno po stronie serwera (Server Actions, dal.ts), jak i w komponentach
// klienckich error.tsx / global-error.tsx, które renderują ją po otrzymaniu
// przechwyconego błędu.
export const DB_CONNECTION_ERROR_MESSAGE =
  'Nie można połączyć się z bazą danych. Spróbuj ponownie później.'
