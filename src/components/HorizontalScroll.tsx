import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Horizontal scroll container that prevents vertical page scrolling
 * when the user swipes horizontally on mobile.
 */
const HorizontalScroll = ({ children, className }: HorizontalScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let isHorizontal: boolean | null = null;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isHorizontal = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);

      if (isHorizontal === null && (dx > 5 || dy > 5)) {
        isHorizontal = dx > dy;
      }

      if (isHorizontal) {
        e.preventDefault(); // block vertical scroll
      }
    };

    // Must be { passive: false } so preventDefault() works
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
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {children}
    </div>
  );
};

export default HorizontalScroll;
