import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ErrorListener } from '@/components/error-listener'
import { DESCRICAO_PADRAO, NOME_DO_SITE, SITE_URL, TITULO_PADRAO } from '@/lib/site'
import './globals.css'

const geistSans = Geist({ 
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({ 
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

// Título e descrição padrão + a prévia de quando o link é colado no WhatsApp,
// no Twitter e afins. A imagem é `app/opengraph-image.tsx`, que o Next liga
// sozinho ao og:image de toda página. Página que precisa de título próprio
// exporta só `title` e o template completa.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITULO_PADRAO, template: `%s · ${NOME_DO_SITE}` },
  description: DESCRICAO_PADRAO,
  applicationName: NOME_DO_SITE,
  openGraph: {
    type: 'website',
    siteName: NOME_DO_SITE,
    locale: 'pt_BR',
    alternateLocale: ['en_US'],
    title: TITULO_PADRAO,
    description: DESCRICAO_PADRAO,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITULO_PADRAO,
    description: DESCRICAO_PADRAO,
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fa' },
    { media: '(prefers-color-scheme: dark)', color: '#17191e' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="bg-background">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorListener />
          {children}
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
