import { Fredoka, Quicksand } from 'next/font/google'
import type { Metadata } from 'next'
import './globals.css'

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
})
const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
})

export const metadata: Metadata = {
  title: 'ScanJob — Australian IT Job Market',
  description: 'Analytics dashboard for Australian IT job market trends',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} ${quicksand.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
