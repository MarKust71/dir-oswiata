import Link from 'next/link'

import packageJson from '../../package.json'
import { getCurrentUser } from '@/lib/dal'
import { getMaintenanceMode } from '@/lib/settings'
import { logoutAction } from '@/app/actions/auth'
import { buttonVariants } from '@/components/ui/button'
import { roleLabels } from '@/lib/labels'
import { homePathForRole } from '@/lib/dal'
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
} from '@/lib/contact'
import { Role } from '@/generated/prisma/enums'

import { SiteHeaderNav } from './site-header-nav'

export async function SiteHeader() {
  const user = await getCurrentUser()
  const maintenanceMode = user ? false : await getMaintenanceMode()

  const links = user
    ? [
        ...(user.role === Role.ADMIN || user.role === Role.USER
          ? [
              { href: '/dashboard', label: 'Użytkownicy' },
              { href: '/results', label: 'Wyniki' },
              { href: '/statistics', label: 'Statystyki' },
            ]
          : []),
        ...(user.role === Role.ADMIN
          ? [{ href: '/settings', label: 'Ustawienia' }]
          : []),
      ]
    : []

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4 px-4 py-2 sm:h-14 sm:items-center sm:py-0">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
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
          <SiteHeaderNav
            links={links}
            roleLabel={roleLabels[user.role]}
            email={user.email}
            logoutAction={logoutAction}
          />
        ) : (
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              Zaloguj
            </Link>
            {!maintenanceMode && (
              <Link href="/register" className={buttonVariants({ size: 'sm' })}>
                Zarejestruj
              </Link>
            )}
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
