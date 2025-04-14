"use client"

import React, { useEffect, useCallback, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "./SidebarContext"
import { useSearchContext } from "./SearchContext"
import { useTheme } from "next-themes"
import { SearchModal } from "./SearchModal"

export function Header() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()
  const { toggleSearch, setIsOpen: setSearchOpen } = useSearchContext()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      toggleSearch()
    }
  }, [toggleSearch]);

  useEffect(() => {
    setMounted(true)
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const renderThemeToggle = () => {
    if (!mounted) {
      return (
        <button
          aria-label="Toggle theme"
          className="p-2 rounded-md text-[--color-nav-text] hover:bg-[--color-secondary] dark:hover:bg-[--color-secondary]"
        >
          <Moon size={18} aria-hidden="true" />
        </button>
      )
    }

    return (
      <button
        onClick={handleThemeToggle}
        className="p-2 rounded-md text-[--color-nav-text] hover:bg-[--color-secondary] dark:hover:bg-[--color-secondary]"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        {theme === 'dark' ? (
          <Sun size={18} aria-hidden="true" />
        ) : (
          <Moon size={18} aria-hidden="true" />
        )}
      </button>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[--color-header-border] bg-[--color-header-bg] backdrop-blur supports-[backdrop-filter]:bg-[--color-header-bg]">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
          {/* Mobile layout */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button 
              id="sidebar-toggle"
              className="p-2 rounded-md lg:hidden flex-shrink-0"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar menu"
            >
              <Menu className="h-5 w-5 text-[--color-nav-text]" />
            </button>
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 mr-4 flex-shrink-0">
              <span className="font-medium hidden sm:inline text-[--color-heading]">Inference Gateway</span>
            </Link>
            
            {/* Search bar */}
            <div className="flex-grow lg:hidden max-w-sm">
              <div 
                className="flex items-center border border-[--color-search-border] rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-[--color-primary] w-full cursor-pointer bg-[--color-search-button]"
                onClick={() => setSearchOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 text-[--color-search-icon] flex-shrink-0">
                  <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 14L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm text-[--color-search-placeholder]">Search...</span>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/getting-started" className={cn(
                "header-nav-link text-sm font-medium transition-colors hover:text-[--color-nav-hover]",
                pathname.includes("getting-started") ? "text-[--color-nav-active]" : "text-[--color-nav-text]"
              )}>
                Docs
              </Link>
              <Link href="/examples" className={cn(
                "header-nav-link text-sm font-medium transition-colors hover:text-[--color-nav-hover]",
                pathname.includes("examples") ? "text-[--color-nav-active]" : "text-[--color-nav-text]"
              )}>
                Examples
              </Link>
              <Link href="/api-reference" className={cn(
                "header-nav-link text-sm font-medium transition-colors hover:text-[--color-nav-hover]",
                pathname.includes("api-reference") ? "text-[--color-nav-active]" : "text-[--color-nav-text]"
              )}>
                API
              </Link>
              <a href="https://github.com/inference-gateway" target="_blank" rel="noopener noreferrer" className="text-sm font-medium transition-colors hover:text-[--color-nav-hover] text-[--color-nav-text]">
                GitHub
              </a>
            </nav>
          </div>
          
          {/* Desktop search */}
          <div className="hidden lg:flex items-center ml-auto space-x-4">
            <div className="relative">
              <div 
                className="flex items-center border border-[--color-search-border] rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-[--color-primary] cursor-pointer bg-[--color-search-button]"
                onClick={() => setSearchOpen(true)}  
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 text-[--color-search-icon]">
                  <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 14L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm text-[--color-search-placeholder] w-40 lg:w-60">Search documentation...</span>
                <div className="flex items-center border border-[--color-search-border] rounded px-1 ml-2 text-xs text-[--color-search-button-text]">
                  <span>⌘</span>
                  <span>K</span>
                </div>
              </div>
            </div>

            {/* Theme toggle button */}
            {renderThemeToggle()}
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal />
    </>
  )
}
