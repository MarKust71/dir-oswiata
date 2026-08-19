"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { verifyEmailAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VerifyEmailButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await verifyEmailAction(token);
      setResult(res);
    });
  }

  if (result) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className={cn("text-sm", result.success ? "text-foreground" : "text-destructive")}>
          {result.message}
        </p>
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Wroc do logowania
        </Link>
      </div>
    );
  }

  return (
    <Button onClick={handleClick} disabled={pending} className="h-10 w-full">
      {pending ? "Potwierdzanie..." : "Potwierdz adres e-mail"}
    </Button>
  );
}
