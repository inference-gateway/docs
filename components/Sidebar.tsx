"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './SidebarContext'

const sections = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/" },
      { title: "Getting Started", href: "/getting-started" },
      { title: "Architecture Overview", href: "/architecture-overview" }
    ]
  },
  {
    title: "Core Concepts",
    items: [
      { title: "Configuration", href: "/configuration" },
      { title: "Deployment", href: "/deployment" },
      { title: "Supported Providers", href: "/supported-providers" }
    ]
  },
  {
    title: "API Reference",
    items: [
      { title: "REST API", href: "/api-reference" },
      { title: "SDKs", href: "/sdks" }
    ]
  },
  {
    title: "Guides",
    items: [
      { title: "Examples", href: "/examples" },
      { title: "IDEs", href: "/ides" },
      { title: "Observability", href: "/observability" },
      { title: "UI Components", href: "/ui" }
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isOpen, setIsOpen } = useSidebar()
  
  const initialOpenSections = Object.fromEntries(
    sections.map(section => {
      const isActive = section.items.some(item => item.href === pathname);
      return [section.title, isActive || pathname === '/'];
    })
  )
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(initialOpenSections)

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }))
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-20 transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      
      {/* Sidebar */}
      <div 
        id="sidebar"
        className={isOpen ? 'sidebar-open' : ''}
      >
        <div className="pb-10 pt-5">
          <div className="px-4 space-y-8">
            {sections.map((section) => (
              <div key={section.title} className="space-y-3">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex w-full items-center justify-between px-2 py-1 text-sm font-medium text-[--color-sidebar-section] hover:text-[--color-primary] transition-colors"
                >
                  <span className="font-semibold">{section.title}</span>
                  {openSections[section.title] ? (
                    <ChevronDown className="h-4 w-4 text-[--color-sidebar-icon]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[--color-sidebar-icon]" />
                  )}
                </button>
                
                {openSections[section.title] && (
                  <div className="space-y-1 pl-2">
                    {section.items.map((item) => (
                      <div
                        key={item.href}
                        className={cn(
                          "border-l-2",
                          pathname === item.href
                            ? "border-[--color-primary]"
                            : "border-transparent"
                        )}
                      >
                        <Link
                          href={item.href}
                          className={cn(
                            "block py-1.5 pl-3 text-sm transition-colors",
                            pathname === item.href
                              ? "text-[--color-sidebar-active] font-medium"
                              : "text-[--color-sidebar-link] hover:text-[--color-sidebar-link-hover]"
                          )}
                        >
                          {item.title}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            <div className="space-y-3">
              <div className="px-2 text-sm font-semibold text-[--color-sidebar-section]">More</div>
              <div className="space-y-2 pl-2">
                <a 
                  href="https://github.com/inference-gateway" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-[--color-sidebar-link] hover:text-[--color-sidebar-link-hover]"
                >
                  <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
