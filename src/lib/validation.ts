import * as z from "zod";

export const RegisterSchema = z.object({
  email: z.email({ error: "Podaj prawidlowy adres e-mail." }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Haslo musi miec co najmniej 8 znakow." })
    .regex(/[a-zA-Z]/, { error: "Haslo musi zawierac co najmniej jedna litere." })
    .regex(/[0-9]/, { error: "Haslo musi zawierac co najmniej jedna cyfre." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  error: "Hasla nie sa identyczne.",
  path: ["confirmPassword"],
});

export type RegisterFormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
        confirmPassword?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;

export const LoginSchema = z.object({
  email: z.email({ error: "Podaj prawidlowy adres e-mail." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Podaj haslo." }),
});

export type LoginFormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
      };
      message?: string;
      canResend?: boolean;
      email?: string;
    }
  | undefined;
