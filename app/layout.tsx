import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './v2.css'
import { Providers } from './providers'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

const themeBootstrap = `
(function () {
  try {
    var preference = localStorage.getItem('theme') || 'system';
    var dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(dark ? 'dark' : 'light');
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (_) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();`

export const metadata: Metadata = {
  title: {
    default: 'OfflineAcademy — Your Personal Offline Learning Center',
    template: '%s | OfflineAcademy',
  },
  description: 'A self-hosted, privacy-first learning platform for offline courses. Download, organize, and watch your educational content without internet.',
  keywords: ['offline learning', 'course platform', 'self-hosted', 'video courses', 'education', 'LMS'],
  authors: [{ name: 'OfflineAcademy' }],
  creator: 'OfflineAcademy',
  publisher: 'OfflineAcademy',
  robots: 'noindex, nofollow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:6969',
    siteName: 'OfflineAcademy',
    title: 'OfflineAcademy — Your Personal Offline Learning Center',
    description: 'A self-hosted, privacy-first learning platform for offline courses.',
    images: [
      { url: '/og-image.svg', width: 1200, height: 630, alt: 'OfflineAcademy Dashboard' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OfflineAcademy',
    description: 'Your Personal Offline Learning Center',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link rel="icon" href="/favicon16x16.ico" sizes="16x16" type="image/x-icon" />
        <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icon-512.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#090d16" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f8fafc" media="(prefers-color-scheme: light)" />
      </head>
      <body className={`${inter.variable} min-h-screen bg-background font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Script id="sw-registration" strategy="lazyOnload">
          {`if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
              .then(reg => console.log('SW registered:', reg.scope))
              .catch(err => console.log('SW registration failed:', err))
          }`}
        </Script>
      </body>
    </html>
  )
}
