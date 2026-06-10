import type { Metadata } from 'next'
import { DM_Mono } from 'next/font/google'
import './globals.css'

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Taste',
  description: 'Art Director capture and taste synthesis',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Taste',
  },
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  },
  themeColor: '#F3ECDD',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmMono.variable}>
      <head>
        <style>{`
          :root { --font-display: 'ABCArizonaFlare'; }
        `}</style>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Taste" />
        <meta name="application-name" content="Taste" />
        <meta name="theme-color" content="#F3ECDD" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ fontFamily: 'var(--mono)', background: 'var(--cream)', color: 'var(--ink)' }}>
        {children}
      </body>
    </html>
  )
}
