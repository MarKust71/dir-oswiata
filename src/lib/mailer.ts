import 'server-only'
import nodemailer from 'nodemailer'

import packageJson from '../../package.json'
import { prisma } from '@/lib/prisma'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from '@/lib/contact'
import { formatWarsawTimestamp } from '@/lib/warsaw-time'
import { logEvent } from '@/lib/event-log'
import {
  getAwsDailySendLimit,
  getAwsMaxSendRatePerSecond,
} from '@/lib/settings'
import { EventType } from '@/generated/prisma/enums'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, APP_URL } =
  process.env

// Stopka dodawana do treści każdego wysyłanego maila - zarówno powiadomień,
// jak i wiadomości związanych z zakładaniem/aktywacją konta.
const EMAIL_FOOTER_LINES = [
  'Dolnośląska Izba Rzemieślnicza we Wrocławiu',
  `${CONTACT_EMAIL}, ${CONTACT_PHONE_DISPLAY}`,
  `System DIR Oświata, v.${packageJson.version}`,
]

const EMAIL_FOOTER_TEXT = EMAIL_FOOTER_LINES.join('\n')
const EMAIL_FOOTER_HTML = `<p><strong>${EMAIL_FOOTER_LINES[0]}</strong><br><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>, ${CONTACT_PHONE_DISPLAY}<br><span style="font-size:0.85em;">${EMAIL_FOOTER_LINES[2]}</span></p>`

function withFooter(body: string): string {
  return `${body}\n\n${EMAIL_FOOTER_TEXT}`
}

function withFooterHtml(body: string): string {
  return `${body}<hr />${EMAIL_FOOTER_HTML}`
}

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    return null
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  })
}

// AWS SES narzuca dwa niezależne ograniczenia (widoczne w konsoli SES:
// Account dashboard -> Sending limits) - dzienną kwotę wysyłki i maksymalne
// tempo wysyłania. Wartości konfigurowalne w Ustawieniach (zob.
// src/lib/settings.ts) - domyślnie odpowiadają trybowi sandbox SES (200/24h,
// 1 mail/s), z zapasem poniżej twardego limitu, bo skrzynki może używać też
// coś poza tą aplikacją.
const DAILY_SEND_WINDOW_MS = 24 * 60 * 60 * 1000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Dowolna stała, unikalna w skali aplikacji - identyfikuje blokadę używaną
// tylko do serializacji rezerwacji miejsca w limicie wysyłki.
const SEND_LIMIT_LOCK_KEY = 727001

// Sprawdzenie limitu, odczekanie na tempo wysyłki i zapis licznika muszą być
// jedną, niepodzielną operacją - w przeciwnym razie równoległe wywołania
// sendMail() (np. powiadomienie do kilku adresów administracyjnych naraz
// przez Promise.all, albo kilka równoczesnych żądań na różnych instancjach
// serverless) mogłyby odczytać ten sam licznik, zanim którekolwiek zdąży go
// zwiększyć (przekroczenie dziennej kwoty), albo wysłać maile bliżej siebie
// w czasie niż pozwala maksymalne tempo SES (odrzucenie/throttling).
// pg_advisory_xact_lock serializuje te rezerwacje na czas transakcji
// (włącznie z ewentualnym odczekaniem) i zwalnia się sam przy jej
// zakończeniu (commit lub rollback).
async function tryReserveSendSlot(): Promise<{
  ok: boolean
  dailyLimit: number
}> {
  const [dailyLimit, maxRatePerSecond] = await Promise.all([
    getAwsDailySendLimit(),
    getAwsMaxSendRatePerSecond(),
  ])
  const minIntervalMs = Math.ceil(1000 / maxRatePerSecond)

  const ok = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SEND_LIMIT_LOCK_KEY})`

    const windowStart = new Date(Date.now() - DAILY_SEND_WINDOW_MS)

    // Sprzątanie starych wpisów przy okazji sprawdzania limitu - bez osobnego
    // zadania czyszczącego, bo tabela i tak przechowuje tylko dane z
    // ostatniej doby.
    await tx.emailSendLog.deleteMany({
      where: { createdAt: { lt: windowStart } },
    })
    const sentInWindow = await tx.emailSendLog.count({
      where: { createdAt: { gte: windowStart } },
    })

    if (sentInWindow >= dailyLimit) return false

    const lastSend = await tx.emailSendLog.findFirst({
      orderBy: { createdAt: 'desc' },
    })
    if (lastSend) {
      const elapsedMs = Date.now() - lastSend.createdAt.getTime()
      if (elapsedMs < minIntervalMs) {
        await sleep(minIntervalMs - elapsedMs)
      }
    }

    await tx.emailSendLog.create({ data: {} })

    return true
  })

  return { ok, dailyLimit }
}

// Jedyne miejsce, które faktycznie woła transporter.sendMail() - dzięki temu
// dzienna kwota i tempo wysyłki są pilnowane dla całej aplikacji naraz,
// niezależnie od tego, która funkcja poniżej wywołała wysyłkę.
async function sendMail({
  to,
  subject,
  text,
  html,
  logLabel,
}: {
  to: string
  subject: string
  text: string
  html: string
  logLabel: string
}) {
  const transporter = getTransporter()

  if (!transporter) {
    // SMTP nie jest skonfigurowany (brak SMTP_HOST/SMTP_USER/SMTP_PASSWORD w
    // .env.local) - wypisujemy treść w logach, żeby np. link weryfikacyjny
    // dało się ręcznie odczytać w trakcie developmentu.
    console.warn(
      `[mailer] SMTP nie jest skonfigurowany (${logLabel} -> ${to}). ${text}`
    )

    return
  }

  const { ok: canSend, dailyLimit } = await tryReserveSendSlot()

  if (!canSend) {
    const message = `Pominięto wysyłkę (${logLabel}) do ${to} - osiągnięto dzienny limit ${dailyLimit} maili.`
    console.error(`[mailer] ${message}`)

    await logEvent({
      type: EventType.EMAIL_SEND_SKIPPED_HOURLY_LIMIT,
      message,
      targetEmail: to,
    })

    return
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      text,
      html,
    })

    console.log(
      `[mailer] Wysłano (${logLabel}) do ${to} (messageId: ${info.messageId}, response: ${info.response})`
    )
  } catch (error) {
    // Blad wysylki (np. odrzucony adres odbiorcy) nie moze wywalic calej
    // operacji, ktora go wywolala - jest juz zapisana w bazie niezaleznie od
    // tego, czy mail dotarl. Miejsce w limicie zostaje zarezerwowane mimo
    // błędu - próba wysyłki i tak obciążyła sesję SMTP u dostawcy.
    console.error(
      `[mailer] Nie udało się wysłać (${logLabel}) do ${to}:`,
      error
    )

    await logEvent({
      type: EventType.EMAIL_SEND_FAILED,
      message: `Nie udało się wysłać (${logLabel}) do ${to}: ${error instanceof Error ? error.message : String(error)}`,
      targetEmail: to,
    })
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL ?? 'http://localhost:3000'}/verify-email/${token}`

  await sendMail({
    to: email,
    subject: 'Potwierdź swój adres e-mail',
    text: withFooter(
      `Kliknij w link, aby potwierdzić adres e-mail: ${verifyUrl}`
    ),
    html: withFooterHtml(
      `<p>Kliknij link, aby potwierdzić adres e-mail:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
    ),
    logLabel: 'mail weryfikacyjny',
  })
}

export async function sendPendingApprovalNotification(
  adminEmails: string[],
  userEmail: string
) {
  if (adminEmails.length === 0) return

  const message = `${formatWarsawTimestamp(new Date())} - użytkownik ${userEmail} oczekuje na akceptację`
  const text = withFooter(message)
  const html = withFooterHtml(`<p>${message}</p>`)

  await Promise.all(
    adminEmails.map((to) =>
      sendMail({
        to,
        subject: 'Nowe konto oczekuje na akceptację',
        text,
        html,
        logLabel: 'powiadomienie o oczekującym koncie',
      })
    )
  )
}

export async function sendAccountActivatedEmail(email: string) {
  const loginUrl = `${APP_URL ?? 'http://localhost:3000'}/login`

  await sendMail({
    to: email,
    subject: 'Twoje konto zostało aktywowane',
    text: withFooter(
      `Twoje konto jest już aktywne. Możesz się zalogować: ${loginUrl}`
    ),
    html: withFooterHtml(
      `<p>Twoje konto jest już aktywne. Możesz się zalogować:</p><p><a href="${loginUrl}">${loginUrl}</a></p>`
    ),
    logLabel: 'mail o aktywacji',
  })
}

export async function sendAccountStatusChangeAdminNotification(
  adminEmails: string[],
  actorEmail: string,
  actorRoleLabel: string,
  targetEmail: string,
  activated: boolean
) {
  if (adminEmails.length === 0) return

  const verb = activated ? 'aktywował' : 'dezaktywował'
  const message = `${formatWarsawTimestamp(new Date())}: Użytkownik ${actorEmail} (rola: ${actorRoleLabel}) ${verb} konto użytkownika ${targetEmail}.`
  const text = withFooter(message)
  const html = withFooterHtml(`<p>${message}</p>`)
  const subject = activated
    ? 'Konto użytkownika zostało aktywowane'
    : 'Konto użytkownika zostało dezaktywowane'

  await Promise.all(
    adminEmails.map((to) =>
      sendMail({
        to,
        subject,
        text,
        html,
        logLabel: 'powiadomienie o zmianie statusu konta',
      })
    )
  )
}

export async function sendAccountLockedAdminNotification(
  adminEmails: string[],
  userEmail: string
) {
  if (adminEmails.length === 0) return

  const message = `Konto użytkownika "${userEmail}" zostało zablokowane ze względu na trzykrotne wprowadzenie błędnego numeru wniosku.`
  const text = withFooter(message)
  const html = withFooterHtml(`<p>${message}</p>`)

  await Promise.all(
    adminEmails.map((to) =>
      sendMail({
        to,
        subject: 'Konto użytkownika zostało zablokowane',
        text,
        html,
        logLabel: 'powiadomienie o zablokowaniu konta',
      })
    )
  )
}

export async function sendAccountLockedUserEmail(email: string) {
  await sendMail({
    to: email,
    subject: 'Twoje konto zostało zablokowane',
    text: withFooter(
      'Twoje konto "DIR Oświata" zostało zablokowane. Skontaktuj się z administratorem.'
    ),
    html: withFooterHtml(
      '<p>Twoje konto "DIR Oświata" zostało zablokowane. Skontaktuj się z administratorem.</p>'
    ),
    logLabel: 'mail o zablokowaniu konta',
  })
}

export async function sendResultsViewLimitReachedAdminNotification(
  adminEmails: string[],
  userEmail: string
) {
  if (adminEmails.length === 0) return

  const message = `Konto użytkownika "${userEmail}" zostało zablokowane ze względu na wykorzystanie limitu 3 wyświetleń wyników.`
  const text = withFooter(message)
  const html = withFooterHtml(`<p>${message}</p>`)

  await Promise.all(
    adminEmails.map((to) =>
      sendMail({
        to,
        subject: 'Konto użytkownika zostało zablokowane',
        text,
        html,
        logLabel: 'powiadomienie o zablokowaniu konta (limit wyświetleń)',
      })
    )
  )
}

export async function sendMissingResultAdminNotification(
  adminEmails: string[],
  userEmail: string
) {
  if (adminEmails.length === 0) return

  const message = `Użytkownik "${userEmail}" zalogował się w okresie udostępniania wyników, ale nie znaleziono dla niego wyniku w bazie (dopasowanie po imieniu, nazwisku i numerze PESEL).`
  const text = withFooter(message)
  const html = withFooterHtml(`<p>${message}</p>`)

  await Promise.all(
    adminEmails.map((to) =>
      sendMail({
        to,
        subject: 'Brak wyniku dla użytkownika',
        text,
        html,
        logLabel: 'powiadomienie o braku wyniku',
      })
    )
  )
}

export async function sendProfileCorrectionAdminNotification(
  adminEmails: string[],
  userEmail: string
) {
  if (adminEmails.length === 0) return

  const message = `Użytkownik "${userEmail}" poprawił w panelu swoje dane (imię, nazwisko, telefon lub cyfry numeru PESEL). Konto zostało tymczasowo dezaktywowane i wymaga ponownej weryfikacji oraz aktywacji.`
  const text = withFooter(message)
  const html = withFooterHtml(`<p>${message}</p>`)

  await Promise.all(
    adminEmails.map((to) =>
      sendMail({
        to,
        subject: 'Konto użytkownika wymaga ponownej aktywacji',
        text,
        html,
        logLabel: 'powiadomienie o poprawie danych konta',
      })
    )
  )
}

export async function sendProfileCorrectionUserEmail(email: string) {
  await sendMail({
    to: email,
    subject: 'Twoje konto wymaga ponownej aktywacji',
    text: withFooter(
      'Zapisaliśmy Twoje poprawione dane. Ze względów bezpieczeństwa Twoje konto zostało tymczasowo dezaktywowane i wymaga ponownej aktywacji przez administratora. Poinformujemy Cię osobnym e-mailem, gdy konto zostanie ponownie aktywowane.'
    ),
    html: withFooterHtml(
      '<p>Zapisaliśmy Twoje poprawione dane. Ze względów bezpieczeństwa Twoje konto zostało tymczasowo dezaktywowane i wymaga ponownej aktywacji przez administratora.</p><p>Poinformujemy Cię osobnym e-mailem, gdy konto zostanie ponownie aktywowane.</p>'
    ),
    logLabel: 'mail o dezaktywacji po poprawie danych',
  })
}

export async function sendResultsViewLimitReachedUserEmail(email: string) {
  await sendMail({
    to: email,
    subject: 'Twoje konto zostało zablokowane',
    text: withFooter(
      'Wykorzystałeś limit prawidłowych wyświetleń swoich wyników. Twoje konto zostało zablokowane.'
    ),
    html: withFooterHtml(
      '<p>Wykorzystałeś limit prawidłowych wyświetleń swoich wyników. Twoje konto zostało zablokowane.</p>'
    ),
    logLabel: 'mail o zablokowaniu konta (limit wyświetleń)',
  })
}

export async function sendDuplicateResultRegistrationAttemptUserEmail(
  email: string
) {
  await sendMail({
    to: email,
    subject: 'Próba założenia nowego konta z Twoimi danymi',
    text: withFooter(
      'Zanotowaliśmy próbę założenia nowego konta pozwalającego na poznanie Twojego wyniku egzaminu.'
    ),
    html: withFooterHtml(
      '<p>Zanotowaliśmy próbę założenia nowego konta pozwalającego na poznanie Twojego wyniku egzaminu.</p>'
    ),
    logLabel: 'mail o próbie rejestracji duplikatu konta',
  })
}

export async function sendDuplicateResultRegistrationAttemptAdminNotification(
  adminEmails: string[],
  existingAccountEmail: string,
  attemptedEmail: string
) {
  if (adminEmails.length === 0) return

  const message = `Zablokowano próbę rejestracji konta (${attemptedEmail}) - podane dane (imię, nazwisko, cyfry numeru PESEL) pasują do wyniku już przypisanego do konta ${existingAccountEmail}.`
  const text = withFooter(message)
  const html = withFooterHtml(`<p>${message}</p>`)

  await Promise.all(
    adminEmails.map((to) =>
      sendMail({
        to,
        subject: 'Zablokowana próba rejestracji - duplikat wyniku',
        text,
        html,
        logLabel: 'powiadomienie o próbie rejestracji duplikatu konta',
      })
    )
  )
}

export async function sendDuplicateResultProfileEditAttemptUserEmail(
  email: string
) {
  await sendMail({
    to: email,
    subject: 'Próba podłączenia innego konta do Twojego wyniku',
    text: withFooter(
      'Zanotowaliśmy próbę podłączenia innego konta do Twojego wyniku egzaminu poprzez edycję danych profilu. Twoje konto i wynik pozostają bezpieczne.'
    ),
    html: withFooterHtml(
      '<p>Zanotowaliśmy próbę podłączenia innego konta do Twojego wyniku egzaminu poprzez edycję danych profilu. Twoje konto i wynik pozostają bezpieczne.</p>'
    ),
    logLabel: 'mail o próbie podłączenia innego konta do wyniku',
  })
}

export async function sendDuplicateResultProfileEditAttemptAdminNotification(
  adminEmails: string[],
  existingAccountEmail: string,
  blockedAccountEmail: string
) {
  if (adminEmails.length === 0) return

  const message = `Zablokowano konto ${blockedAccountEmail} po edycji danych w panelu - poprawione dane (imię, nazwisko, cyfry numeru PESEL) pasują do wyniku już przypisanego do konta ${existingAccountEmail}.`
  const text = withFooter(message)
  const html = withFooterHtml(`<p>${message}</p>`)

  await Promise.all(
    adminEmails.map((to) =>
      sendMail({
        to,
        subject: 'Zablokowane konto - próba podłączenia do cudzego wyniku',
        text,
        html,
        logLabel: 'powiadomienie o zablokowaniu konta (cudzy wynik)',
      })
    )
  )
}
