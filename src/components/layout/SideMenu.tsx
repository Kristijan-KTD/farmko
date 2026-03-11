import { X, User, ShoppingBag, Camera, Store, Search, MessageCircle, Bell, MapPin, LogOut, Users, Home, BarChart3, Crown, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import farmkoLogo from "@/assets/farmko-logo-horizontal.png";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isDesktop?: boolean;
}

const SideMenu = ({ isOpen, onClose, isDesktop = false }: SideMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();

  const farmerMenuItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: ShoppingBag, label: "Post Item for Sell", path: "/post-item" },
    { icon: Camera, label: "My Instafarm", path: "/instafarm" },
    { icon: Store, label: "My Store", path: "/my-store" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Crown, label: "Plans", path: "/plans" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: MapPin, label: "Radar", path: "/radar" },
  ];

  const customerMenuItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: Users, label: "Find Farmer", path: "/find-farmer" },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: MapPin, label: "Radar", path: "/radar" },
  ];

  const menuItems = [
    ...(user?.role === "farmer" ? farmerMenuItems : customerMenuItems),
    ...(isAdmin ? [{ icon: Shield, label: "Admin Panel", path: "/admin" }] : []),
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    if (!isDesktop) onClose();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    if (!isDesktop) onClose();
  };

  // Desktop persistent sidebar
  if (isDesktop) {
    return (
      <div className="h-screen bg-primary fixed top-0 left-0 w-64 flex flex-col">
        <div className="p-6">
          <img src={farmkoLogo} alt="Farmko" className="h-8 w-auto" />
          <p className="text-primary-foreground/70 text-xs capitalize mt-1">{user?.role} Account</p>
        </div>

        {/* User info */}
        <div className="px-6 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-primary-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-primary-foreground">{user?.name}</p>
            <p className="text-xs text-primary-foreground/70">{user?.email}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto">
          {menuItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => handleNavigate(path)}
                className={`flex items-center gap-3 text-primary-foreground py-2.5 px-3 rounded-lg transition-colors text-left text-sm ${
                  isActive ? "bg-sidebar-accent font-semibold" : "hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-3 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-primary-foreground py-2.5 px-3 rounded-lg hover:bg-sidebar-accent transition-colors w-full text-left text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    );
  }

  // Mobile drawer sidebar
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-primary z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-6 overflow-hidden">
          <button onClick={onClose} className="self-end text-primary-foreground mb-4 flex-shrink-0">
            <X className="w-6 h-6" />
          </button>

          <div className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-0">
            {menuItems.map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path;
              return (
                <button
                  key={path}
                  onClick={() => handleNavigate(path)}
                  className={`flex items-center gap-4 text-primary-foreground py-3 px-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left flex-shrink-0 ${
                    isActive ? "bg-sidebar-accent font-semibold" : ""
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 text-primary-foreground py-3 px-2 rounded-lg hover:bg-sidebar-accent transition-colors w-full text-left"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SideMenu;
