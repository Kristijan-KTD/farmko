import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Horizontal-only scroll container.
 * Combines CSS touch-action with JS preventDefault for maximum
 * cross-browser compatibility on mobile.
 */
const HorizontalScroll = ({ children, className }: HorizontalScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let direction: "h" | "v" | null = null;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      direction = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);

      // Determine direction after a small movement threshold
      if (direction === null && (dx > 3 || dy > 3)) {
        direction = dx >= dy ? "h" : "v";
      }

      // If swiping horizontally, prevent the page from scrolling vertically
      if (direction === "h") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "flex overflow-x-auto overflow-y-hidden no-scrollbar",
        className
      )}
      style={{
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorX: "contain",
      }}
    >
      {children}
    </div>
  );
};

export default HorizontalScroll;
