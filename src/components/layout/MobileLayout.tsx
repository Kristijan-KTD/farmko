import React, { ReactNode } from "react";
import SideMenu from "./SideMenu";
import { useAuth } from "@/contexts/AuthContext";

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  hideDesktopSidebar?: boolean;
}

const MobileLayout = ({ children, className = "", noPadding = false, hideDesktopSidebar = false }: MobileLayoutProps) => {
  const { isAuthenticated } = useAuth();
  const showSidebar = isAuthenticated && !hideDesktopSidebar;

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Desktop sidebar - always visible on large screens when authenticated */}
      {showSidebar && (
        <div className="hidden lg:block w-64 flex-shrink-0 h-screen sticky top-0">
          <SideMenu isOpen={true} onClose={() => {}} isDesktop />
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 flex justify-center min-h-screen">
        <div className={`w-full ${showSidebar ? 'lg:max-w-3xl' : 'max-w-md lg:max-w-3xl'} min-h-screen flex flex-col ${noPadding ? "" : "px-6"} ${className}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default MobileLayout;
