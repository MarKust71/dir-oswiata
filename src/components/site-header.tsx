import Link from 'next/link'

import { getCurrentUser } from '@/lib/dal'
import { logoutAction } from '@/app/actions/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { roleLabels } from '@/lib/labels'
import { homePathForRole } from '@/lib/dal'

export async function SiteHeader() {
  const user = await getCurrentUser()

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href={user ? homePathForRole(user.role) : '/'}
          className="font-heading text-base font-semibold"
        >
          DIR Oświata
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {roleLabels[user.role]}
            </Badge>
            <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                Wyloguj
              </Button>
            </form>
          </div>
        ) : (
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              Zaloguj
            </Link>
            <Link href="/register" className={buttonVariants({ size: 'sm' })}>
              Zarejestruj
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
