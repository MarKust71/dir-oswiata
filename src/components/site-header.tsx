import Link from 'next/link'

import packageJson from '../../package.json'
import { getCurrentUser } from '@/lib/dal'
import { logoutAction } from '@/app/actions/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { roleLabels } from '@/lib/labels'
import { homePathForRole } from '@/lib/dal'
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
} from '@/lib/contact'
import { Role } from '@/generated/prisma/enums'

export async function SiteHeader() {
  const user = await getCurrentUser()

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-baseline gap-2">
          <Link
            href={user ? homePathForRole(user.role) : '/'}
            className="font-heading text-base font-semibold"
          >
            DIR Oświata
          </Link>
          <span className="text-xs font-normal text-muted-foreground">
            wersja: {packageJson.version}
          </span>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            {user.role === Role.ADMIN && (
              <Link
                href="/settings"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                Ustawienia
              </Link>
            )}
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

      <div className="border-t px-4 py-1.5 text-center text-xs text-muted-foreground">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="hover:text-foreground hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
        {' | '}
        <a
          href={CONTACT_PHONE_HREF}
          className="hover:text-foreground hover:underline"
        >
          {CONTACT_PHONE_DISPLAY}
        </a>
      </div>
    </header>
  )
}
