import React from "react";
import { cn } from "@/lib/utils";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Horizontal-only scroll container.
 * Uses touch-action: pan-x to tell the browser this element
 * only scrolls horizontally – the page will NOT move vertically
 * while the user's finger is inside this container.
 */
const HorizontalScroll = ({ children, className }: HorizontalScrollProps) => {
  return (
    <div
      className={cn("flex overflow-x-auto overflow-y-hidden no-scrollbar", className)}
      style={{
        touchAction: "pan-x",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorX: "contain",
        overscrollBehaviorY: "none",
      }}
    >
      {children}
    </div>
  );
};

export default HorizontalScroll;
