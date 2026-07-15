"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

// hasNext is inferred by the caller from `data.length === limit` - the
// ApiResponse envelope carries no total count, so this is standard
// offset-pagination without a page-count backend query.
export default function Pagination({ page, hasNext, onPrev, onNext }: PaginationProps) {
  if (page === 0 && !hasNext) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="flex min-h-10 items-center gap-1 rounded-lg border border-border-subtle bg-surface-white px-3.5 py-2 text-xs font-semibold text-text-secondary transition-all hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </button>
      <span className="text-xs font-semibold text-text-secondary">Page {page + 1}</span>
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="flex min-h-10 items-center gap-1 rounded-lg border border-border-subtle bg-surface-white px-3.5 py-2 text-xs font-semibold text-text-secondary transition-all hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
