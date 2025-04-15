import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Header } from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import { SidebarProvider } from '@/components/SidebarContext'
import { SearchProvider } from '@/components/SearchContext'
import { ThemeProvider as NextThemesProvider } from "next-themes"
import TableOfContents from '@/components/TableOfContents'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Inference Gateway Documentation',
  description: 'Documentation for the Inference Gateway, a proxy for multiple language model APIs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode,
}) {
  return (
    <>
      <html lang="en" className="h-full" suppressHydrationWarning>
        <body className={`${inter.className} h-full`}>
          <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
            <SearchProvider>
              <SidebarProvider>
                <Header />
                <div className="flex h-[calc(100%-64px)]">
                  <Sidebar />
                  <main className="flex-1 overflow-y-auto overflow-x-hidden ml-0 lg:ml-72">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
                      <div className="flex flex-col lg:flex-row lg:gap-12">
                        <div className="docs-content flex-1 overflow-x-hidden">{children}</div>
                        <aside className="hidden xl:block w-64 relative mt-8 lg:mt-0">
                          <TableOfContents />
                        </aside>
                      </div>
                    </div>
                  </main>
                </div>
              </SidebarProvider>
            </SearchProvider>
          </NextThemesProvider>
        </body>
      </html>
    </>
  )
}
