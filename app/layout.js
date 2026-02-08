import './globals.css'
import RegisterSW from '../components/RegisterSW'

export const metadata = {
  title: 'Finanças',
  description: 'Controle financeiro compartilhado',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finanças',
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
      <body className="antialiased">
        <RegisterSW />
        {children}
      </body>
    </html>
  )
}
