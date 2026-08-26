import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'
import { getCurrentUser } from '@/lib/dal'
import { getInactivityTimeoutSeconds } from '@/lib/settings'
import { SiteHeader } from '@/components/site-header'
import { InactivityLogout } from '@/components/inactivity-logout'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'DIR Oświata',
  description: 'System kont użytkowników DIR Oświata',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser()
  const inactivityTimeoutSeconds = user
    ? await getInactivityTimeoutSeconds()
    : null

  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <Toaster />
        {user && inactivityTimeoutSeconds && (
          <InactivityLogout timeoutSeconds={inactivityTimeoutSeconds} />
        )}
      </body>
    </html>
  )
}
