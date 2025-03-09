import './globals.css'
import Sidebar from '../components/Sidebar'

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
          <div className="flex-1 p-8">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
