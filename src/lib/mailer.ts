import 'server-only'
import nodemailer from 'nodemailer'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, APP_URL } =
  process.env

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
    // wypisujemy link w logach serwera, zeby mozna bylo recznie dokonczyc weryfikacje w trakcie developmentu.
    console.warn(
      `[mailer] SMTP nie jest skonfigurowany. Link weryfikacyjny dla ${email}: ${verifyUrl}`
    )

    return
  }

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: email,
    subject: 'Potwierdz swoj adres e-mail',
    text: `Kliknij w link, aby potwierdzic adres e-mail: ${verifyUrl}`,
    html: `<p>Kliknij w link, aby potwierdzic adres e-mail:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  })
}
