import './globals.css'
import Sidebar from '@/components/Sidebar'

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
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 md:ml-64 p-4 md:p-8">
            <div className="md:pt-0 pt-16">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
