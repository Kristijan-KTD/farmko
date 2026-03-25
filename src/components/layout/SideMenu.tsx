import { X, User, ShoppingBag, Camera, Store, Search, MessageCircle, Bell, MapPin, LogOut, Users, Home, BarChart3, Crown, Shield, ChevronsLeft, ChevronsRight, Heart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import farmkoLogo from "@/assets/farmko-logo-horizontal.png";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isDesktop?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface MenuGroup {
  label: string;
  items: { icon: typeof Home; label: string; path: string }[];
}

const SideMenu = ({ isOpen, onClose, isDesktop = false, collapsed = false, onToggleCollapse }: SideMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();

  const farmerGroups: MenuGroup[] = [
    {
      label: "Main",
      items: [
        { icon: Home, label: "Home", path: "/home" },
        { icon: Search, label: "Explore", path: "/explore" },
        { icon: MapPin, label: "Radar", path: "/radar" },
      ],
    },
    {
      label: "Business",
      items: [
        { icon: ShoppingBag, label: "Post Item", path: "/post-item" },
        { icon: Store, label: "My Store", path: "/my-store" },
        { icon: BarChart3, label: "Analytics", path: "/analytics" },
      ],
    },
    {
      label: "Social",
      items: [
        { icon: Camera, label: "Instafarm", path: "/instafarm" },
        { icon: Heart, label: "Saved", path: "/favorites" },
        { icon: MessageCircle, label: "Chat", path: "/chat" },
        { icon: Bell, label: "Notifications", path: "/notifications" },
      ],
    },
    {
      label: "Account",
      items: [
        { icon: User, label: "Profile", path: "/profile" },
        { icon: Crown, label: "Plans", path: "/plans" },
      ],
    },
  ];

  const customerGroups: MenuGroup[] = [
    {
      label: "Main",
      items: [
        { icon: Home, label: "Home", path: "/home" },
        { icon: Search, label: "Explore", path: "/explore" },
        { icon: MapPin, label: "Radar", path: "/radar" },
      ],
    },
    {
      label: "Discover",
      items: [
        { icon: Users, label: "Find Farmer", path: "/find-farmer" },
        { icon: Heart, label: "Saved", path: "/favorites" },
      ],
    },
    {
      label: "Social",
      items: [
        { icon: MessageCircle, label: "Chat", path: "/chat" },
        { icon: Bell, label: "Notifications", path: "/notifications" },
      ],
    },
    {
      label: "Account",
      items: [
        { icon: User, label: "Profile", path: "/profile" },
      ],
    },
  ];

  const groups = user?.role === "farmer" ? farmerGroups : customerGroups;

  // Append admin
  if (isAdmin) {
    groups.push({
      label: "Admin",
      items: [{ icon: Shield, label: "Admin Panel", path: "/admin" }],
    });
  }

  const handleNavigate = (path: string) => {
    navigate(path);
    if (!isDesktop) onClose();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    if (!isDesktop) onClose();
  };

  const renderGroups = (groups: MenuGroup[]) => (
    <>
      {groups.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-wider font-semibold px-3 pt-3 pb-1 opacity-100 text-[#dde3e0]/[0.83]">
              {group.label}
            </p>
          )}
          {collapsed && <div className="h-2" />}
          {group.items.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => handleNavigate(path)}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 text-primary-foreground py-2 px-3 rounded-lg transition-colors text-left text-sm w-full ${
                  collapsed ? "justify-center" : ""
                } ${isActive ? "bg-sidebar-accent font-semibold" : "hover:bg-sidebar-accent/50"}`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </>
  );

  // Desktop persistent sidebar
  if (isDesktop) {
    return (
      <div className={`h-screen bg-primary fixed top-0 left-0 flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
        <div className={`p-4 ${collapsed ? "flex justify-center" : "px-6 pt-6"}`}>
          {!collapsed && (
            <>
              <img src={farmkoLogo} alt="Farmko" className="h-8 w-auto" />
              <p className="text-primary-foreground/70 text-xs capitalize mt-1">{user?.role} Account</p>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="px-6 pb-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary-foreground truncate">{user?.name}</p>
              <p className="text-xs text-primary-foreground/70 truncate">{user?.email}</p>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col px-2 overflow-y-auto sidebar-scroll">
          {renderGroups(groups)}
        </div>

        <div className="px-2 py-1">
          <button
            onClick={handleLogout}
            title={collapsed ? "Log Out" : undefined}
            className={`flex items-center gap-3 text-primary-foreground py-2 px-3 rounded-lg hover:bg-sidebar-accent transition-colors w-full text-left text-sm ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>

        <div className="px-2 pb-3">
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-full py-2 rounded-lg text-primary-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
          >
            {collapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
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
        <div className="flex flex-col h-full py-4 px-2 overflow-hidden">
          <button onClick={onClose} className="self-end text-primary-foreground mb-2 mr-2 flex-shrink-0">
            <X className="w-6 h-6" />
          </button>

          <div className="flex-1 flex flex-col overflow-y-auto min-h-0 pb-4">
            {renderGroups(groups)}

            <div className="border-t border-primary-foreground/20 mt-3 pt-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 text-primary-foreground py-2.5 px-3 rounded-lg hover:bg-sidebar-accent transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SideMenu;
