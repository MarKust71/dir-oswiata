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
  sendPendingApprovalNotification,
  sendVerificationEmail,
} from '@/lib/mailer'
import { getMaintenanceMode, getNotificationEmails } from '@/lib/settings'
import { AccountStatus, Role } from '@/generated/prisma/enums'

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h

async function issueVerificationToken(userId: string, email: string) {
  const token = crypto.randomBytes(32).toString('hex')
  await prisma.verificationToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  })
  await sendVerificationEmail(email, token)
}

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

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.STUDENT,
        status: AccountStatus.PENDING_EMAIL,
        firstName,
        lastName,
        phone: phone || null,
        peselPositions: validated.data.peselPositions,
        peselDigits: validated.data.peselDigits,
      },
    })

    await issueVerificationToken(user.id, user.email)

    return {
      success: true,
      message:
        'Konto zostało utworzone. Sprawdź swoją skrzynkę e-mail i potwierdź adres, aby przejść do akceptacji administratora.',
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

    const notificationEmails = await getNotificationEmails()
    await sendPendingApprovalNotification(
      notificationEmails,
      verifiedUser.email
    )

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
      await prisma.verificationToken.deleteMany({ where: { userId: user.id } })
      await issueVerificationToken(user.id, user.email)
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
