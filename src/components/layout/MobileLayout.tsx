import React, { ReactNode, useState, useRef, useEffect } from "react";
import SideMenu from "./SideMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  hideDesktopSidebar?: boolean;
}

const MobileLayout = ({ children, className = "", noPadding = false, hideDesktopSidebar = false }: MobileLayoutProps) => {
  const { isAuthenticated } = useAuth();
  const showSidebar = isAuthenticated && !hideDesktopSidebar;
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex">
      {showSidebar && (
        <div className={`hidden lg:block flex-shrink-0 h-screen sticky top-0 transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
          <SideMenu isOpen={true} onClose={() => {}} isDesktop collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        </div>
      )}
      
      <div ref={scrollRef} className="flex-1 flex justify-center h-screen overflow-y-auto overflow-x-hidden">
        <div className={`w-full max-w-full lg:max-w-3xl min-h-screen flex flex-col ${noPadding ? "" : "px-3 lg:px-6"} ${className}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default MobileLayout;
