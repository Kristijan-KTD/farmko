import React, { ReactNode } from "react";

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

const MobileLayout = ({ children, className = "", noPadding = false }: MobileLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className={`w-full max-w-md min-h-screen flex flex-col ${noPadding ? "" : "px-6"} ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default MobileLayout;
