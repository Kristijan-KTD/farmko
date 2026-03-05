import { Menu, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface TopBarProps {
  onMenuOpen: () => void;
  title?: string;
}

const TopBar = ({ onMenuOpen, title }: TopBarProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-between py-4">
      <button onClick={onMenuOpen} className="p-1">
        <Menu className="w-6 h-6 text-foreground" />
      </button>
      {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/notifications")} className="p-1 relative">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
        </button>
        <button onClick={() => navigate("/profile")} className="w-8 h-8 rounded-full bg-muted overflow-hidden">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
              {user?.name?.[0] || "U"}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default TopBar;
