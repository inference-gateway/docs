import './globals.css'
import Sidebar from '@/components/Sidebar'
import { SidebarProvider } from '@/components/SidebarContext'
import { Header } from '@/components/Header'
import TableOfContents from '@/components/TableOfContents'

export const metadata = {
  title: 'Inference Gateway Documentation',
  description: 'Documentation for the Inference Gateway project',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-white text-gray-900 min-h-screen">
        <SidebarProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex flex-1">
              {/* Left sidebar */}
              <Sidebar />
              
              {/* Main content area */}
              <div className="flex w-full lg:pl-72">
                <main className="docs-content flex-1">
                  <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
                    {children}
                  </div>
                </main>
                
                {/* Right sidebar for ToC */}
                <aside className="hidden xl:block w-64 flex-shrink-0 pr-8 pt-10">
                  <TableOfContents />
                </aside>
              </div>
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  )
}
