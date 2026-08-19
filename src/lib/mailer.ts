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
    // wypisujemy link w logach serwera, żeby można było ręcznie dokończyć weryfikację w trakcie developmentu.
    console.warn(
      `[mailer] SMTP nie jest skonfigurowany. Link weryfikacyjny dla ${email}: ${verifyUrl}`
    )

    return
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: email,
      subject: 'Potwierdź swój adres e-mail',
      text: `Kliknij w link, aby potwierdzić adres e-mail: ${verifyUrl}`,
      html: `<p>Kliknij link, aby potwierdzić adres e-mail:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    })
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
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: email,
      subject: 'Twoje konto zostało aktywowane',
      text: `Twoje konto jest już aktywne. Możesz się zalogować: ${loginUrl}`,
      html: `<p>Twoje konto jest już aktywne. Możesz się zalogować:</p><p><a href="${loginUrl}">${loginUrl}</a></p>`,
    })
  } catch (error) {
    // Blad wysylki nie moze zablokowac aktywacji konta przez administratora -
    // konto jest juz aktywne w bazie niezaleznie od tego, czy mail dotarl.
    console.error(
      `[mailer] Nie udało się wysłać maila o aktywacji konta do ${email}:`,
      error
    )
  }
}
