import type { Metadata } from 'next'
import { DM_Mono } from 'next/font/google'
import './globals.css'
import { OnlineFlush } from '@/components/OnlineFlush'

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Taste',
  description: 'Art Director capture and taste synthesis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmMono.variable}>
      <head>
        <style>{`
          :root { --font-display: 'ABCArizonaFlare'; }
        `}</style>
      </head>
      <body style={{ fontFamily: 'var(--mono)', background: 'var(--cream)', color: 'var(--ink)' }}>
        <OnlineFlush />
        {children}
      </body>
    </html>
  )
}
