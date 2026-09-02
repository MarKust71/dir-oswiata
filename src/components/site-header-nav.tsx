'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type NavLink = { href: string; label: string }

export function SiteHeaderNav({
  links,
  roleLabel,
  email,
  logoutAction,
}: {
  links: NavLink[]
  roleLabel: string
  email: string
  logoutAction: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-1 flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-3">
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Badge variant="secondary">{roleLabel}</Badge>
        <span className="max-w-20 truncate text-sm text-muted-foreground sm:max-w-40">
          {email}
        </span>

        <form action={logoutAction} className="hidden sm:block">
          <Button type="submit" variant="outline" size="sm">
            Wyloguj
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="sm:hidden"
          aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </Button>
      </div>

      {open && (
        <nav className="flex w-full flex-col items-stretch gap-1 border-t pt-2 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className: 'justify-start',
              })}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full"
            >
              Wyloguj
            </Button>
          </form>
        </nav>
      )}
    </div>
  )
}
