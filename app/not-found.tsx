import Link from 'next/link'
import { FileQuestion, Home } from 'lucide-react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-10 text-center space-y-6 shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
            <FileQuestion size={32} className="text-indigo-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Meeting not found</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              The meeting you&apos;re looking for doesn&apos;t exist, was deleted,
              or you don&apos;t have permission to view it.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Link href="/">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 w-full sm:w-auto">
                <Home size={14} /> Back to QuickSplit
              </Button>
            </Link>
            <Link href="/meetings">
              <Button variant="outline" className="w-full sm:w-auto">
                My Meetings
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </>
  )
}
