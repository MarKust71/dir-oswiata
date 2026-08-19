'use server'

import crypto from 'node:crypto'
import { redirect } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'
import { createSession, deleteSession } from '@/lib/session'
import { homePathForRole } from '@/lib/dal'
import {
  RegisterSchema,
  LoginSchema,
  type RegisterFormState,
  type LoginFormState,
} from '@/lib/validation'
import { sendVerificationEmail } from '@/lib/mailer'
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
  const validated = RegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email, password } = validated.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { message: 'Konto z tym adresem e-mail juz istnieje.' }
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.STUDENT,
      status: AccountStatus.PENDING_EMAIL,
    },
  })

  await issueVerificationToken(user.id, user.email)

  return {
    success: true,
    message:
      'Konto zostalo utworzone. Sprawdz swoja skrzynke e-mail i potwierdz adres, aby przejsc do akceptacji administratora.',
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

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { message: 'Nieprawidlowy e-mail lub haslo.' }
  }

  if (user.status === AccountStatus.PENDING_EMAIL) {
    return {
      message:
        'Potwierdz najpierw swoj adres e-mail - sprawdz skrzynke pocztowa.',
      canResend: true,
      email: user.email,
    }
  }
  if (user.status === AccountStatus.PENDING_APPROVAL) {
    return { message: 'Konto oczekuje na akceptacje administratora.' }
  }
  if (user.status === AccountStatus.DISABLED) {
    return {
      message:
        'To konto zostalo dezaktywowane. Skontaktuj sie z administratorem.',
    }
  }

  await createSession(user.id, user.role)
  redirect(homePathForRole(user.role))
}

export async function logoutAction() {
  await deleteSession()
  redirect('/login')
}

export async function verifyEmailAction(token: string) {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!record) {
    return {
      success: false as const,
      message: 'Link weryfikacyjny jest nieprawidlowy lub zostal juz uzyty.',
    }
  }

  if (record.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: record.id } })

    return {
      success: false as const,
      message:
        'Link weryfikacyjny wygasl. Zarejestruj sie ponownie lub popros o nowy link.',
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        emailVerifiedAt: new Date(),
        status: AccountStatus.PENDING_APPROVAL,
      },
    }),
    prisma.verificationToken.delete({ where: { id: record.id } }),
  ])

  return {
    success: true as const,
    message:
      'Adres e-mail zostal potwierdzony. Konto oczekuje teraz na akceptacje administratora.',
  }
}

export async function resendVerificationAction(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (user && user.status === AccountStatus.PENDING_EMAIL) {
    await prisma.verificationToken.deleteMany({ where: { userId: user.id } })
    await issueVerificationToken(user.id, user.email)
  }

  // Zawsze ten sam komunikat, niezaleznie od tego czy konto istnieje - zeby nie ujawniac,
  // ktore adresy e-mail sa zarejestrowane.
  return {
    message:
      'Jesli konto oczekuje na potwierdzenie e-mail, wyslalismy nowy link.',
  }
}
