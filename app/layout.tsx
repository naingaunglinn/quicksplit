import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'QuickSplit — AI Meeting Intelligence',
  description: 'Instantly extract summaries, action items, and follow-up emails from any meeting.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-50 text-neutral-900 antialiased`}>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
