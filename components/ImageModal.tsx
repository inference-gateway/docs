"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
}

export function ImageModal({ isOpen, onClose, content, title }: ImageModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-[95vw] max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '90vw', height: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 bg-white dark:bg-gray-900">
          <h3 className="font-medium text-lg">{title || 'Diagram'}</h3>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content - scrollable container */}
        <div className="flex-1 overflow-auto p-6">
          <div 
            className="diagram-container flex items-center justify-center min-w-fit min-h-fit"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}
