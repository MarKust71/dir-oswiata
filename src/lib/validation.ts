import * as z from 'zod'

export const RegisterSchema = z
  .object({
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
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Hasła nie są identyczne.',
    path: ['confirmPassword'],
  })

export type RegisterFormState =
  | {
      errors?: {
        email?: string[]
        password?: string[]
        confirmPassword?: string[]
      }
      message?: string
      success?: boolean
    }
  | undefined

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
