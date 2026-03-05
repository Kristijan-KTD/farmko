import { X, User, ShoppingBag, Camera, Store, Search, MessageCircle, Bell, MapPin, LogOut, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideMenu = ({ isOpen, onClose }: SideMenuProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const farmerMenuItems = [
    { icon: User, label: "Profile", path: "/profile" },
    { icon: ShoppingBag, label: "Post Item for Sell", path: "/post-item" },
    { icon: Camera, label: "My Instafarm", path: "/instafarm" },
    { icon: Store, label: "My Store", path: "/my-store" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: MapPin, label: "Radar", path: "/radar" },
  ];

  const customerMenuItems = [
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: Users, label: "Find Farmer", path: "/find-farmer" },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: MapPin, label: "Radar", path: "/radar" },
  ];

  const menuItems = user?.role === "farmer" ? farmerMenuItems : customerMenuItems;

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    onClose();
  };

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
        <div className="flex flex-col h-full p-6">
          <button onClick={onClose} className="self-end text-primary-foreground mb-8">
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col gap-1">
            {menuItems.map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => handleNavigate(path)}
                className="flex items-center gap-4 text-primary-foreground py-3 px-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto">
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
