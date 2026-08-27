import 'server-only'
import nodemailer from 'nodemailer'

import packageJson from '../../package.json'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from '@/lib/contact'
import { formatWarsawTimestamp } from '@/lib/warsaw-time'

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
const EMAIL_FOOTER_HTML = `<p>${EMAIL_FOOTER_LINES.join('<br>')}</p>`

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

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL ?? 'http://localhost:3000'}/verify-email/${token}`
  const transporter = getTransporter()

  if (!transporter) {
    // SMTP nie jest skonfigurowany (brak SMTP_HOST/SMTP_USER/SMTP_PASSWORD w .env.local) -
    // wypisujemy link w logach serwera, żeby można było ręcznie dokończyć weryfikację w trakcie developmentu.
    console.warn(
      `[mailer] SMTP nie jest skonfigurowany. Link weryfikacyjny dla ${email}: ${verifyUrl}`
    )

    return
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: email,
      subject: 'Potwierdź swój adres e-mail',
      text: withFooter(
        `Kliknij w link, aby potwierdzić adres e-mail: ${verifyUrl}`
      ),
      html: withFooterHtml(
        `<p>Kliknij link, aby potwierdzić adres e-mail:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
      ),
    })

    console.log(
      `[mailer] Wysłano mail weryfikacyjny do ${email} (messageId: ${info.messageId}, response: ${info.response})`
    )
  } catch (error) {
    // Blad wysylki (np. odrzucony adres odbiorcy) nie moze wywalic calej
    // rejestracji - konto jest juz zapisane w bazie, uzytkownik moze
    // poprosic o ponowne wyslanie linku.
    console.error(
      `[mailer] Nie udało się wysłać maila weryfikacyjnego do ${email}:`,
      error
    )
  }
}

export async function sendPendingApprovalNotification(
  adminEmails: string[],
  userEmail: string
) {
  if (adminEmails.length === 0) return

  const text = withFooter(
    `${formatWarsawTimestamp(new Date())} - użytkownik ${userEmail} oczekuje na akceptację`
  )
  const transporter = getTransporter()

  if (!transporter) {
    console.warn(
      `[mailer] SMTP nie jest skonfigurowany. Powiadomienie: ${text}`
    )

    return
  }

  await Promise.all(
    adminEmails.map(async (to) => {
      try {
        const info = await transporter.sendMail({
          from: SMTP_FROM || SMTP_USER,
          to,
          subject: 'Nowe konto oczekuje na akceptację',
          text,
        })

        console.log(
          `[mailer] Wysłano powiadomienie o oczekującym koncie do ${to} (messageId: ${info.messageId}, response: ${info.response})`
        )
      } catch (error) {
        console.error(
          `[mailer] Nie udało się wysłać powiadomienia o oczekującym koncie do ${to}:`,
          error
        )
      }
    })
  )
}

export async function sendAccountActivatedEmail(email: string) {
  const loginUrl = `${APP_URL ?? 'http://localhost:3000'}/login`
  const transporter = getTransporter()

  if (!transporter) {
    console.warn(
      `[mailer] SMTP nie jest skonfigurowany. Konto ${email} zostało aktywowane.`
    )

    return
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: email,
      subject: 'Twoje konto zostało aktywowane',
      text: withFooter(
        `Twoje konto jest już aktywne. Możesz się zalogować: ${loginUrl}`
      ),
      html: withFooterHtml(
        `<p>Twoje konto jest już aktywne. Możesz się zalogować:</p><p><a href="${loginUrl}">${loginUrl}</a></p>`
      ),
    })

    console.log(
      `[mailer] Wysłano mail o aktywacji do ${email} (messageId: ${info.messageId}, response: ${info.response})`
    )
  } catch (error) {
    // Blad wysylki nie moze zablokowac aktywacji konta przez administratora -
    // konto jest juz aktywne w bazie niezaleznie od tego, czy mail dotarl.
    console.error(
      `[mailer] Nie udało się wysłać maila o aktywacji konta do ${email}:`,
      error
    )
  }
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
  const text = withFooter(
    `${formatWarsawTimestamp(new Date())}: Użytkownik ${actorEmail} (rola: ${actorRoleLabel}) ${verb} konto użytkownika ${targetEmail}.`
  )
  const transporter = getTransporter()

  if (!transporter) {
    console.warn(
      `[mailer] SMTP nie jest skonfigurowany. Powiadomienie: ${text}`
    )

    return
  }

  await Promise.all(
    adminEmails.map(async (to) => {
      try {
        const info = await transporter.sendMail({
          from: SMTP_FROM || SMTP_USER,
          to,
          subject: activated
            ? 'Konto użytkownika zostało aktywowane'
            : 'Konto użytkownika zostało dezaktywowane',
          text,
        })

        console.log(
          `[mailer] Wysłano powiadomienie o zmianie statusu konta do ${to} (messageId: ${info.messageId}, response: ${info.response})`
        )
      } catch (error) {
        console.error(
          `[mailer] Nie udało się wysłać powiadomienia o zmianie statusu konta do ${to}:`,
          error
        )
      }
    })
  )
}

export async function sendAccountLockedAdminNotification(
  adminEmails: string[],
  userEmail: string
) {
  if (adminEmails.length === 0) return

  const text = withFooter(
    `Konto użytkownika "${userEmail}" zostało zablokowane ze względu na trzykrotne wprowadzenie błędnego numeru wniosku.`
  )
  const transporter = getTransporter()

  if (!transporter) {
    console.warn(
      `[mailer] SMTP nie jest skonfigurowany. Powiadomienie: ${text}`
    )

    return
  }

  await Promise.all(
    adminEmails.map(async (to) => {
      try {
        const info = await transporter.sendMail({
          from: SMTP_FROM || SMTP_USER,
          to,
          subject: 'Konto użytkownika zostało zablokowane',
          text,
        })

        console.log(
          `[mailer] Wysłano powiadomienie o zablokowaniu konta do ${to} (messageId: ${info.messageId}, response: ${info.response})`
        )
      } catch (error) {
        console.error(
          `[mailer] Nie udało się wysłać powiadomienia o zablokowaniu konta do ${to}:`,
          error
        )
      }
    })
  )
}

export async function sendAccountLockedUserEmail(email: string) {
  const text = withFooter(
    'Twoje konto "DIR Oświata" zostało zablokowane. Skontaktuj się z administratorem.'
  )
  const transporter = getTransporter()

  if (!transporter) {
    console.warn(`[mailer] SMTP nie jest skonfigurowany. ${text}`)

    return
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: email,
      subject: 'Twoje konto zostało zablokowane',
      text,
      html: withFooterHtml(
        '<p>Twoje konto "DIR Oświata" zostało zablokowane. Skontaktuj się z administratorem.</p>'
      ),
    })

    console.log(
      `[mailer] Wysłano mail o zablokowaniu konta do ${email} (messageId: ${info.messageId}, response: ${info.response})`
    )
  } catch (error) {
    // Blad wysylki nie moze cofnac zablokowania konta - konto pozostaje
    // zablokowane w bazie niezaleznie od tego, czy mail dotarl.
    console.error(
      `[mailer] Nie udało się wysłać maila o zablokowaniu konta do ${email}:`,
      error
    )
  }
}

export async function sendResultsViewLimitReachedAdminNotification(
  adminEmails: string[],
  userEmail: string
) {
  if (adminEmails.length === 0) return

  const text = withFooter(
    `Konto użytkownika "${userEmail}" zostało zablokowane ze względu na wykorzystanie limitu 3 wyświetleń wyników.`
  )
  const transporter = getTransporter()

  if (!transporter) {
    console.warn(
      `[mailer] SMTP nie jest skonfigurowany. Powiadomienie: ${text}`
    )

    return
  }

  await Promise.all(
    adminEmails.map(async (to) => {
      try {
        const info = await transporter.sendMail({
          from: SMTP_FROM || SMTP_USER,
          to,
          subject: 'Konto użytkownika zostało zablokowane',
          text,
        })

        console.log(
          `[mailer] Wysłano powiadomienie o zablokowaniu konta (limit wyświetleń) do ${to} (messageId: ${info.messageId}, response: ${info.response})`
        )
      } catch (error) {
        console.error(
          `[mailer] Nie udało się wysłać powiadomienia o zablokowaniu konta (limit wyświetleń) do ${to}:`,
          error
        )
      }
    })
  )
}

export async function sendMissingResultAdminNotification(
  adminEmails: string[],
  userEmail: string
) {
  if (adminEmails.length === 0) return

  const text = withFooter(
    `Użytkownik "${userEmail}" zalogował się w okresie udostępniania wyników, ale nie znaleziono dla niego wyniku w bazie (dopasowanie po imieniu, nazwisku i numerze PESEL).`
  )
  const transporter = getTransporter()

  if (!transporter) {
    console.warn(
      `[mailer] SMTP nie jest skonfigurowany. Powiadomienie: ${text}`
    )

    return
  }

  await Promise.all(
    adminEmails.map(async (to) => {
      try {
        const info = await transporter.sendMail({
          from: SMTP_FROM || SMTP_USER,
          to,
          subject: 'Brak wyniku dla użytkownika',
          text,
        })

        console.log(
          `[mailer] Wysłano powiadomienie o braku wyniku do ${to} (messageId: ${info.messageId}, response: ${info.response})`
        )
      } catch (error) {
        console.error(
          `[mailer] Nie udało się wysłać powiadomienia o braku wyniku do ${to}:`,
          error
        )
      }
    })
  )
}

export async function sendResultsViewLimitReachedUserEmail(email: string) {
  const text = withFooter(
    'Wykorzystałeś limit prawidłowych wyświetleń swoich wyników. Twoje konto zostało zablokowane.'
  )
  const transporter = getTransporter()

  if (!transporter) {
    console.warn(`[mailer] SMTP nie jest skonfigurowany. ${text}`)

    return
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: email,
      subject: 'Twoje konto zostało zablokowane',
      text,
      html: withFooterHtml(
        '<p>Wykorzystałeś limit prawidłowych wyświetleń swoich wyników. Twoje konto zostało zablokowane.</p>'
      ),
    })

    console.log(
      `[mailer] Wysłano mail o zablokowaniu konta (limit wyświetleń) do ${email} (messageId: ${info.messageId}, response: ${info.response})`
    )
  } catch (error) {
    console.error(
      `[mailer] Nie udało się wysłać maila o zablokowaniu konta (limit wyświetleń) do ${email}:`,
      error
    )
  }
}
