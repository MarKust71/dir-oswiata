import * as z from 'zod'

import { PESEL_LENGTH, PESEL_REVEAL_COUNT } from '@/lib/pesel'

const NAME_REGEX = /^[\p{L} '-]+$/u

const RegisterFieldsSchema = z.object({
  email: z
    .email({ error: 'Podaj prawidłowy adres e-mail.' })
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, { error: 'Hasło musi mieć co najmniej 8 znaków.' })
    .regex(/[a-zA-Z]/, {
      error: 'Hasło musi zawierać co najmniej jedną literę.',
    })
    .regex(/[0-9]/, {
      error: 'Hasło musi zawierać co najmniej jedną cyfrę.',
    }),
  confirmPassword: z.string(),
  firstName: z
    .string()
    .trim()
    .min(2, { error: 'Imię musi mieć co najmniej 2 znaki.' })
    .regex(NAME_REGEX, { error: 'Imię może zawierać tylko litery.' }),
  lastName: z
    .string()
    .trim()
    .min(2, { error: 'Nazwisko musi mieć co najmniej 2 znaki.' })
    .regex(NAME_REGEX, { error: 'Nazwisko może zawierać tylko litery.' }),
  peselPositions: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(PESEL_LENGTH - 1)
    )
    .length(PESEL_REVEAL_COUNT, {
      error: 'Nieprawidłowe dane weryfikacyjne PESEL.',
    }),
  peselDigits: z
    .array(z.string().regex(/^[0-9]$/, { error: 'Dozwolone są tylko cyfry.' }))
    .length(PESEL_REVEAL_COUNT, {
      error: 'Wprowadź wskazane cyfry numeru PESEL.',
    }),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{0,11}$/, {
      error:
        'Numer telefonu może zawierać tylko cyfry, z opcjonalnym "+" na początku (maks. 11 cyfr).',
    }),
})

export const RegisterSchema = RegisterFieldsSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    error: 'Hasła nie są identyczne.',
    path: ['confirmPassword'],
  }
)

// Poprawianie danych konta studenta z panelu (imię, nazwisko, telefon i nowy
// układ cyfr PESEL) - zob. src/app/actions/profile.ts. Ten sam zestaw reguł co
// przy rejestracji, bez pól dotyczących hasła i adresu e-mail.
export const ProfileCorrectionSchema = RegisterFieldsSchema.pick({
  firstName: true,
  lastName: true,
  phone: true,
  peselPositions: true,
  peselDigits: true,
})

export type ProfileCorrectionFormState =
  | {
      errors?: {
        firstName?: string[]
        lastName?: string[]
        phone?: string[]
        peselDigits?: string[]
      }
      message?: string
      // Wartości wprowadzone przez użytkownika, zwracane po nieudanej próbie,
      // żeby formularz mógł je przywrócić (poza boxami PESEL).
      values?: {
        firstName?: string
        lastName?: string
        phone?: string
      }
    }
  | undefined

export type RegisterFormState =
  | {
      errors?: {
        email?: string[]
        password?: string[]
        confirmPassword?: string[]
        firstName?: string[]
        lastName?: string[]
        peselDigits?: string[]
        phone?: string[]
      }
      message?: string
      success?: boolean
      // Wartości wprowadzone przez użytkownika, zwracane po nieudanej próbie,
      // żeby formularz mógł je przywrócić, zamiast czyścić (poza boxami PESEL).
      values?: {
        email?: string
        password?: string
        confirmPassword?: string
        firstName?: string
        lastName?: string
        phone?: string
      }
    }
  | undefined

export const NotificationEmailSchema = z
  .email({ error: 'Nieprawidłowy adres e-mail.' })
  .trim()
  .toLowerCase()

export const LoginSchema = z.object({
  email: z
    .email({ error: 'Podaj prawidłowy adres e-mail.' })
    .trim()
    .toLowerCase(),
  password: z.string().min(1, { error: 'Podaj hasło.' }),
})

export type LoginFormState =
  | {
      errors?: {
        email?: string[]
        password?: string[]
      }
      message?: string
      canResend?: boolean
      email?: string
    }
  | undefined
