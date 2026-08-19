"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { loginAction, resendVerificationAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [resendPending, startResend] = useTransition();
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  function handleResend() {
    if (!state?.email) return;
    startResend(async () => {
      const res = await resendVerificationAction(state.email!);
      setResendMessage(res.message);
    });
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Adres e-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jan.kowalski@przyklad.pl"
          required
        />
        {state?.errors?.email && (
          <p className="text-sm text-destructive">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Haslo</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {state?.errors?.password && (
          <p className="text-sm text-destructive">{state.errors.password[0]}</p>
        )}
      </div>

      {state?.message && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-destructive">{state.message}</p>
          {state.canResend && !resendMessage && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendPending}
              className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {resendPending ? "Wysylanie..." : "Wyslij ponownie link weryfikacyjny"}
            </button>
          )}
          {resendMessage && (
            <p className="text-sm text-muted-foreground">{resendMessage}</p>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending} className="mt-2 h-10 w-full">
        {pending ? "Logowanie..." : "Zaloguj sie"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Zarejestruj sie
        </Link>
      </p>
    </form>
  );
}
