import './globals.css'

export const metadata = {
  title: 'Finanças',
  description: 'Controle financeiro compartilhado',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0d0d14',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  )
}
