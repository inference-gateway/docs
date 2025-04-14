"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "./SidebarContext"

export function Header() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
        {/* Mobile layout - sidebar toggle + search bar that takes remaining space */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button 
            id="sidebar-toggle"
            className="p-2 rounded-md lg:hidden flex-shrink-0"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {/* Logo - hidden on smallest screens except as icon */}
          <Link href="/" className="flex items-center gap-2 mr-4 flex-shrink-0">
            <span className="font-medium hidden sm:inline">Inference Gateway</span>
          </Link>
          
          {/* Search bar - takes available space on mobile */}
          <div className="flex-grow lg:hidden max-w-sm">
            <div className="flex items-center border border-gray-200 rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary w-full">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 text-gray-400 flex-shrink-0">
                <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 14L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input 
                type="search" 
                placeholder="Search..." 
                className="bg-transparent outline-none text-sm w-full"
              />
            </div>
          </div>
          
          {/* Navigation - only visible on md screens and up */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/getting-started" className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname.includes("getting-started") ? "text-primary" : "text-foreground/70"
            )}>
              Docs
            </Link>
            <Link href="/examples" className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname.includes("examples") ? "text-primary" : "text-foreground/70"
            )}>
              Examples
            </Link>
            <Link href="/api-reference" className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname.includes("api-reference") ? "text-primary" : "text-foreground/70"
            )}>
              API
            </Link>
            <a href="https://github.com/inference-gateway" target="_blank" rel="noopener noreferrer" className="text-sm font-medium transition-colors hover:text-primary text-foreground/70">
              GitHub
            </a>
          </nav>
        </div>
        
        {/* Desktop search - only visible on lg screens and up */}
        <div className="hidden lg:flex items-center ml-auto">
          <div className="relative">
            <div className="flex items-center border border-gray-200 rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 text-gray-400">
                <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 14L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input 
                type="search" 
                placeholder="Search documentation..." 
                className="bg-transparent outline-none text-sm w-40 lg:w-60"
              />
              <div className="flex items-center border border-gray-200 rounded px-1 ml-2 text-xs text-gray-400">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
