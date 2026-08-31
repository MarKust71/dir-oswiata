'use server'

import crypto from 'node:crypto'
import { redirect } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'
import { createSession, deleteSession } from '@/lib/session'
import { homePathForRole } from '@/lib/dal'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import {
  RegisterSchema,
  LoginSchema,
  type RegisterFormState,
  type LoginFormState,
} from '@/lib/validation'
import {
  sendDuplicateResultRegistrationAttemptAdminNotification,
  sendDuplicateResultRegistrationAttemptUserEmail,
  sendPendingApprovalNotification,
  sendVerificationEmail,
} from '@/lib/mailer'
import {
  findAccountAlreadyLinkedToMatchingResult,
  tryLinkUserToResult,
} from '@/lib/results-matching'
import {
  getMaintenanceMode,
  getNotificationEmails,
  getSkipEmailVerification,
} from '@/lib/settings'
import { maskEmail } from '@/lib/mask-email'
import { getClientRequestInfo } from '@/lib/request-info'
import { logEvent } from '@/lib/event-log'
import { AccountStatus, EventType, Role } from '@/generated/prisma/enums'

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h

async function issueVerificationToken(
  userId: string,
  email: string,
  eventType:
    | typeof EventType.EMAIL_VERIFICATION_SENT
    | typeof EventType.EMAIL_VERIFICATION_RESENT = EventType.EMAIL_VERIFICATION_SENT
) {
  const token = crypto.randomBytes(32).toString('hex')
  await prisma.verificationToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  })
  await sendVerificationEmail(email, token)

  const { ip, userAgent } = await getClientRequestInfo()
  await logEvent({
    type: eventType,
    message:
      eventType === EventType.EMAIL_VERIFICATION_SENT
        ? `Wysłano link weryfikacyjny do ${email}.`
        : `Ponownie wysłano link weryfikacyjny do ${email}.`,
    actorEmail: email,
    actorUserId: userId,
    targetEmail: email,
    targetUserId: userId,
    ip,
    userAgent,
  })
}

// Limit rejestracji z jednego adresu IP - chroni skrzynkę SMTP przed
// zablokowaniem przez dostawcę (OVH) za wzorzec wyglądający jak spam
// (dużo maili weryfikacyjnych w krótkim czasie). Okno na godzinę, limit na
// tyle wysoki, żeby nie blokować kilku uczniów rejestrujących się z jednej
// sieci szkolnej (np. NAT pracowni komputerowej).
const REGISTRATION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1h
const REGISTRATION_RATE_LIMIT_MAX = 10

// Minimalny odstęp między kolejnymi wysyłkami linku weryfikacyjnego dla tego
// samego konta - chroni przed zalaniem jednego adresata wieloma mailami przy
// wielokrotnym kliknięciu "Wyślij ponownie" (lub bezpośrednim wywołaniem
// akcji z pominięciem UI).
const RESEND_COOLDOWN_MS = 60 * 1000 // 1 min

export async function registerAction(
  _state: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  if (await getMaintenanceMode()) {
    return {
      message:
        'Przerwa konserwacyjna. Rejestracja nowych kont jest chwilowo niedostępna.',
    }
  }

  const { ip, userAgent } = await getClientRequestInfo()
  const clientIp = ip ?? 'unknown'
  const rateLimitWindowStart = new Date(
    Date.now() - REGISTRATION_RATE_LIMIT_WINDOW_MS
  )
  // Sprzątanie starych wpisów przy okazji sprawdzania limitu - bez osobnego
  // zadania czyszczącego, bo tabela i tak przechowuje tylko dane z ostatniej
  // godziny.
  await prisma.registrationAttempt.deleteMany({
    where: { createdAt: { lt: rateLimitWindowStart } },
  })
  const recentAttempts = await prisma.registrationAttempt.count({
    where: { ip: clientIp, createdAt: { gte: rateLimitWindowStart } },
  })
  if (recentAttempts >= REGISTRATION_RATE_LIMIT_MAX) {
    await logEvent({
      type: EventType.REGISTRATION_BLOCKED_RATE_LIMIT,
      message: `Zablokowano próbę rejestracji - przekroczono limit ${REGISTRATION_RATE_LIMIT_MAX} rejestracji/h z adresu ${clientIp}.`,
      actorEmail: String(formData.get('email') ?? '') || null,
      ip,
      userAgent,
    })

    return {
      message:
        'Zbyt wiele prób rejestracji z tego miejsca. Spróbuj ponownie za jakiś czas.',
    }
  }

  const peselPositions = formData.getAll('peselPositions').map(Number)
  const peselDigits = peselPositions.map((pos) =>
    String(formData.get(`peselDigit-${pos}`) ?? '')
  )

  // Surowe wartości z formularza, do odesłania z powrotem po nieudanej próbie -
  // pozwalają przywrócić wypełnione pola (poza boxami PESEL).
  const values = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  }

  const validated = RegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    peselPositions,
    peselDigits,
    phone: formData.get('phone'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values }
  }

  const { email, password, firstName, lastName, phone } = validated.data

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { message: 'Konto z tym adresem e-mail juz istnieje.', values }
    }

    // Zanim założymy nowe konto, sprawdzamy, czy podane dane (imię, nazwisko,
    // ujawnione cyfry numeru PESEL) nie pasują już do wyniku przypisanego do
    // innego, istniejącego konta - w takim wypadku nie tworzymy konta.
    const linkedAccountEmail = await findAccountAlreadyLinkedToMatchingResult({
      firstName,
      lastName,
      peselPositions: validated.data.peselPositions,
      peselDigits: validated.data.peselDigits,
    })

    if (linkedAccountEmail) {
      const message = `Wynik egzaminu tej osoby został już wcześniej przypisany do innego konta - ${maskEmail(linkedAccountEmail)}. Powiadomimy tamtego użytkownika o próbie sprawdzenia wyniku. Jeśli uważasz, że to pomyłka, skontaktuj się z DIR.`
      const logMessage = `Zablokowano rejestrację (${email}) - dane pasują do wyniku już przypisanego do konta ${linkedAccountEmail}.`

      console.warn(`[auth] ${logMessage}`)

      await logEvent({
        type: EventType.REGISTRATION_BLOCKED_DUPLICATE_RESULT,
        message: logMessage,
        actorEmail: email,
        targetEmail: linkedAccountEmail,
        ip,
        userAgent,
      })

      await sendDuplicateResultRegistrationAttemptUserEmail(linkedAccountEmail)

      const notificationEmails = await getNotificationEmails()
      await sendDuplicateResultRegistrationAttemptAdminNotification(
        notificationEmails,
        linkedAccountEmail,
        email
      )

      await prisma.registrationAttempt.create({ data: { ip: clientIp } })

      return { message, values }
    }

    const skipEmailVerification = await getSkipEmailVerification()

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.STUDENT,
        status: skipEmailVerification
          ? AccountStatus.PENDING_APPROVAL
          : AccountStatus.PENDING_EMAIL,
        emailVerifiedAt: skipEmailVerification ? new Date() : null,
        firstName,
        lastName,
        phone: phone || null,
        peselPositions: validated.data.peselPositions,
        peselDigits: validated.data.peselDigits,
      },
    })

    await logEvent({
      type: EventType.REGISTRATION_SUBMITTED,
      message: `Zarejestrowano nowe konto: ${user.email}.`,
      actorEmail: user.email,
      actorUserId: user.id,
      targetEmail: user.email,
      targetUserId: user.id,
      ip,
      userAgent,
      metadata: { skipEmailVerification },
    })

    if (skipEmailVerification) {
      // Rejestracja z pominięciem potwierdzenia e-mail (przełącznik w
      // Ustawieniach) - konto trafia od razu do stanu oczekującego na
      // akceptację, więc próba dopasowania do wyniku i powiadomienie
      // administratorów następują już teraz (tak jak przy zwykłym
      // potwierdzeniu adresu e-mail - zob. verifyEmailAction).
      await tryLinkUserToResult(user)

      const notificationEmails = await getNotificationEmails()
      await sendPendingApprovalNotification(notificationEmails, user.email)

      await logEvent({
        type: EventType.ACCOUNT_PENDING_APPROVAL,
        message: `Konto ${user.email} oczekuje na akceptację (rejestracja z pominięciem potwierdzenia e-mail).`,
        actorEmail: user.email,
        actorUserId: user.id,
        targetEmail: user.email,
        targetUserId: user.id,
        ip,
        userAgent,
      })
    } else {
      await issueVerificationToken(user.id, user.email)
    }

    await prisma.registrationAttempt.create({ data: { ip: clientIp } })

    return {
      success: true,
      message: skipEmailVerification
        ? 'Konto zostało utworzone i oczekuje na akceptację administratora. O aktywacji konta poinformujemy Cię e-mailem.'
        : 'Konto zostało utworzone. Sprawdź swoją skrzynkę e-mail i potwierdź adres albo poczekaj na akceptację administratora.',
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { message: DB_CONNECTION_ERROR_MESSAGE, values }
    }
    throw error
  }
}

export async function loginAction(
  _state: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email, password } = validated.data
  const { ip, userAgent } = await getClientRequestInfo()

  let user
  try {
    user = await prisma.user.findUnique({ where: { email } })
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { message: DB_CONNECTION_ERROR_MESSAGE }
    }
    throw error
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await logEvent({
      type: EventType.LOGIN_FAILED,
      message: `Nieudane logowanie: ${email}.`,
      actorEmail: email,
      targetEmail: email,
      targetUserId: user?.id,
      ip,
      userAgent,
    })

    return { message: 'Nieprawidłowy e-mail lub hasło.' }
  }

  if (user.status === AccountStatus.PENDING_EMAIL) {
    return {
      message:
        'Potwierdź najpierw swój adres e-mail - sprawdź skrzynkę pocztową.',
      canResend: true,
      email: user.email,
    }
  }
  if (user.status === AccountStatus.PENDING_APPROVAL) {
    return { message: 'Konto oczekuje na akceptację administratora.' }
  }
  if (user.status === AccountStatus.DISABLED) {
    return {
      message:
        'To konto zostało dezaktywowane. Skontaktuj się z administratorem.',
    }
  }

  if (user.role === Role.STUDENT && (await getMaintenanceMode())) {
    return {
      message:
        'Przerwa konserwacyjna. Serwis będzie dostępny wkrótce. Zajrzyj ponownie za kilka minut.',
    }
  }

  await logEvent({
    type: EventType.LOGIN_SUCCEEDED,
    message: `Zalogowano: ${user.email}.`,
    actorEmail: user.email,
    actorUserId: user.id,
    targetEmail: user.email,
    targetUserId: user.id,
    ip,
    userAgent,
  })

  await createSession(user.id, user.role)
  redirect(homePathForRole(user.role))
}

export async function logoutAction() {
  await deleteSession()
  redirect('/login')
}

export async function logoutForInactivityAction() {
  await deleteSession()
  redirect('/login?reason=inactivity')
}

export async function verifyEmailAction(token: string) {
  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!record) {
      return {
        success: false as const,
        message: 'Link weryfikacyjny jest nieprawidłowy lub został już użyty.',
      }
    }

    if (record.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: record.id } })

      return {
        success: false as const,
        message:
          'Link weryfikacyjny wygasł. Zarejestruj się ponownie lub poproś o nowy link.',
      }
    }

    const [verifiedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          emailVerifiedAt: new Date(),
          status: AccountStatus.PENDING_APPROVAL,
        },
      }),
      prisma.verificationToken.delete({ where: { id: record.id } }),
    ])

    // Pierwszą próbę automatycznego dopasowania do wyniku egzaminu
    // podejmujemy od razu po potwierdzeniu adresu e-mail - nie trzeba już na
    // nią czekać do akceptacji konta przez administratora.
    await tryLinkUserToResult(verifiedUser)

    const notificationEmails = await getNotificationEmails()
    await sendPendingApprovalNotification(
      notificationEmails,
      verifiedUser.email
    )

    const { ip, userAgent } = await getClientRequestInfo()
    await logEvent({
      type: EventType.EMAIL_VERIFIED,
      message: `Potwierdzono adres e-mail: ${verifiedUser.email}.`,
      actorEmail: verifiedUser.email,
      actorUserId: verifiedUser.id,
      targetEmail: verifiedUser.email,
      targetUserId: verifiedUser.id,
      ip,
      userAgent,
    })
    await logEvent({
      type: EventType.ACCOUNT_PENDING_APPROVAL,
      message: `Konto ${verifiedUser.email} oczekuje na akceptację (po potwierdzeniu e-mail).`,
      actorEmail: verifiedUser.email,
      actorUserId: verifiedUser.id,
      targetEmail: verifiedUser.email,
      targetUserId: verifiedUser.id,
      ip,
      userAgent,
    })

    return {
      success: true as const,
      message:
        'Adres e-mail został potwierdzony. Konto oczekuje teraz na akceptację administratora. O aktywacji konta poinformujemy Cię osobnym e-mailem.',
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { success: false as const, message: DB_CONNECTION_ERROR_MESSAGE }
    }
    throw error
  }
}

export async function resendVerificationAction(email: string) {
  const normalizedEmail = email.trim().toLowerCase()

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (user && user.status === AccountStatus.PENDING_EMAIL) {
      const latestToken = await prisma.verificationToken.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      const cooldownActive =
        latestToken &&
        Date.now() - latestToken.createdAt.getTime() < RESEND_COOLDOWN_MS

      if (!cooldownActive) {
        await prisma.verificationToken.deleteMany({
          where: { userId: user.id },
        })
        await issueVerificationToken(
          user.id,
          user.email,
          EventType.EMAIL_VERIFICATION_RESENT
        )
      }
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { message: DB_CONNECTION_ERROR_MESSAGE }
    }
    throw error
  }

  // Zawsze ten sam komunikat, niezależnie od tego czy konto istnieje - żeby nie ujawniać,
  // które adresy e-mail są zarejestrowane.
  return {
    message:
      'Jeśli konto oczekuje na potwierdzenie e-mail, wysłaliśmy nowy link.',
  }
}
