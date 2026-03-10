import React from "react";
import { cn } from "@/lib/utils";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
  snap?: boolean;
}

const HorizontalScroll = ({ children, className, snap = true }: HorizontalScrollProps) => {
  return (
    <div
      className={cn(
        "flex overflow-x-auto overflow-y-hidden gap-4 no-scrollbar",
        snap && "snap-x snap-mandatory",
        className
      )}
      style={{
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorX: "contain",
        touchAction: "pan-x pinch-zoom",
      }}
    >
      {children}
    </div>
  );
};

export default HorizontalScroll;
