import React, { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A horizontal scroll container that prevents vertical page scrolling
 * while the user is swiping horizontally on mobile.
 */
const HorizontalScroll = ({ children, className }: HorizontalScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - startX.current);
    const dy = Math.abs(e.touches[0].clientY - startY.current);

    // Determine direction on first significant move
    if (isHorizontal.current === null && (dx > 5 || dy > 5)) {
      isHorizontal.current = dx > dy;
    }

    // If horizontal swipe, prevent the page from scrolling vertically
    if (isHorizontal.current) {
      e.stopPropagation();
      // We can't preventDefault on a passive listener from React,
      // so we rely on stopPropagation + overflow-hidden trick
    }
  }, []);

  return (
    <div
      ref={ref}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      className={cn(
        "flex overflow-x-auto overflow-y-hidden no-scrollbar",
        className
      )}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {children}
    </div>
  );
};

export default HorizontalScroll;
