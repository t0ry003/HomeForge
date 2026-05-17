'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PageTooltipProps {
  pageKey: string;
  message: string;
  className?: string;
}

const STORAGE_KEY = 'visited_pages';

export function PageTooltip({ pageKey, message, className = '' }: PageTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const visited = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (visited.includes(pageKey)) return;

      // Show tooltip after a brief delay
      const showTimer = setTimeout(() => setVisible(true), 500);

      // Mark as visited
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited, pageKey]));

      // Auto-dismiss after 8 seconds
      const hideTimer = setTimeout(() => setVisible(false), 8500);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    } catch {
      // localStorage not available
    }
  }, [pageKey]);

  if (!visible) return null;

  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-start gap-2 px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-sm ${className}`}
    >
      <p className="flex-1 text-foreground/80">{message}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
