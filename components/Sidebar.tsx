"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  // Close sidebar when route changes (on mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close sidebar when clicking outside (on mobile)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && !sidebar.contains(event.target as Node) && isOpen) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      {/* Mobile toggle button */}
      <button 
        className="fixed top-4 left-4 z-40 p-2 bg-gray-800 rounded md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {isOpen ? (
            <path d="M6 18L18 6M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            <path d="M4 6H20M4 12H20M4 18H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          )}
        </svg>
      </button>
      
      {/* Sidebar */}
      <div 
        id="sidebar"
        className={`fixed inset-y-0 left-0 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition duration-200 ease-in-out z-30 w-64 bg-gray-100 overflow-y-auto`}
      >
        <div className="p-6">
          <h3 className="text-xl font-bold">Inference Gateway</h3>
          <nav className="mt-6">
            <ul className="space-y-2">
              <li>
                <Link href="/" className={`sidebar-link ${pathname === '/' ? 'active' : ''}`}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/architecture-overview" className={`sidebar-link ${pathname === '/architecture-overview' ? 'active' : ''}`}>
                  Architecture Overview
                </Link>
              </li>
              <li>
                <Link href="/getting-started" className={`sidebar-link ${pathname === '/getting-started' ? 'active' : ''}`}>
                  Getting Started
                </Link>
              </li>
              <li>
                <Link href="/api-reference" className={`sidebar-link ${pathname === '/api-reference' ? 'active' : ''}`}>
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/configuration" className={`sidebar-link ${pathname === '/configuration' ? 'active' : ''}`}>
                  Configuration
                </Link>
              </li>
              <li>
                <Link href="/supported-providers" className={`sidebar-link ${pathname === '/supported-providers' ? 'active' : ''}`}>
                  Supported Providers
                </Link>
              </li>
              <li>
                <Link href="/examples" className={`sidebar-link ${pathname === '/examples' ? 'active' : ''}`}>
                  Examples
                </Link>
              </li>
              <li>
                <Link href="/ides" className={`sidebar-link ${pathname === '/ides' ? 'active' : ''}`}>
                  IDEs
                </Link>
              </li>
              <li>
                <Link href="/sdks" className={`sidebar-link ${pathname === '/sdks' ? 'active' : ''}`}>
                  SDKs
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
