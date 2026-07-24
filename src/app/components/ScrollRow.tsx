/**
 * ScrollRow — reusable horizontal-scroll chip/tab row.
 *
 * Pattern: outer div clips (overflow-hidden), inner div scrolls.
 * This is the ONLY correct way to have a scrollable row that does not
 * widen the document body. Use everywhere chips/tabs need to scroll.
 *
 * Usage:
 *   <ScrollRow className="px-4 py-2">
 *     <Chip /><Chip /><Chip />
 *   </ScrollRow>
 */
import React from 'react';

interface ScrollRowProps {
  children: React.ReactNode;
  className?: string;       // applied to the outer (clipping) wrapper
  innerClassName?: string;  // applied to the inner (scrolling) flex row
  gap?: number;             // gap between items in px (default 8)
}

export default function ScrollRow({
  children,
  className = '',
  innerClassName = '',
  gap = 8,
}: ScrollRowProps) {
  return (
    /* Outer: clips to parent width — NEVER use overflow-visible here */
    <div
      className={`w-full overflow-hidden ${className}`}
      style={{ maxWidth: '100%' }}
    >
      {/* Inner: scrolls horizontally within the clipped area */}
      <div
        className={`flex scrollbar-hide ${innerClassName}`}
        style={{
          overflowX: 'auto',
          overflowY: 'visible',
          gap,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
    </div>
  );
}
