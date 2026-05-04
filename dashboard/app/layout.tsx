import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ScanJob — Australian IT Job Market',
  description: 'Analytics dashboard for Australian IT job market trends',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
