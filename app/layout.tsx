import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Header } from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import { SidebarProvider } from '@/components/SidebarContext'
import { SearchProvider } from '@/components/SearchContext'
import TableOfContents from '@/components/TableOfContents'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Inference Gateway Documentation',
  description: 'Documentation for the Inference Gateway, a proxy for multiple language model APIs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <SearchProvider>
          <SidebarProvider>
            <Header />
            <div className="flex h-[calc(100%-64px)]">
              <Sidebar />
              <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-16 overflow-auto ml-0 lg:ml-72">
                <div className="mx-auto max-w-4xl">
                  <div className="flex gap-12">
                    <div className="docs-content flex-1">{children}</div>
                    <aside className="hidden xl:block w-64 relative">
                      <TableOfContents />
                    </aside>
                  </div>
                </div>
              </main>
            </div>
          </SidebarProvider>
        </SearchProvider>
      </body>
    </html>
  )
}
