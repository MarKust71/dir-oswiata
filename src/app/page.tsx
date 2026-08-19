import Link from "next/link";
import { getCurrentUser, homePathForRole } from "@/lib/dal";
import { buttonVariants } from "@/components/ui/button";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="max-w-md font-heading text-3xl font-semibold tracking-tight">
        System kont Dir Oswiata
      </h1>
      <p className="max-w-md text-muted-foreground">
        Rejestracja, logowanie i zarzadzanie dostepem dla administratorow, pracownikow
        i uczniow.
      </p>

      {user ? (
        <Link href={homePathForRole(user.role)} className={buttonVariants({ size: "lg" })}>
          Przejdz do panelu
        </Link>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Zaloguj sie
          </Link>
          <Link href="/register" className={buttonVariants({ size: "lg" })}>
            Zarejestruj sie
          </Link>
        </div>
      )}
    </div>
  );
}
