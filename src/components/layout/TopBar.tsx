import { Menu, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

interface TopBarProps {
  onMenuOpen: () => void;
  title?: string;
}

const TopBar = ({ onMenuOpen, title }: TopBarProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { count } = useUnreadNotifications();

  const displayCount = count > 99 ? "99+" : count;

  return (
    <div className="flex items-center justify-between h-14 sticky top-0 z-30 bg-background">
      <button onClick={onMenuOpen} className="w-8 h-8 flex items-center justify-center -ml-1">
        <Menu className="w-5 h-5 text-foreground" />
      </button>
      {title && <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/notifications")} className="w-8 h-8 flex items-center justify-center relative">
          <Bell className="w-5 h-5 text-foreground" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive rounded-full flex items-center justify-center text-[9px] font-bold text-destructive-foreground">
              {displayCount}
            </span>
          )}
        </button>
        <button onClick={() => navigate("/profile")} className="w-8 h-8 rounded-full bg-muted overflow-hidden">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-muted-foreground">
              {user?.name?.[0] || "U"}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default TopBar;
