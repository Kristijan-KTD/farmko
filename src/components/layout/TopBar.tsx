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
    <div className="flex items-center justify-between h-14">
      <button onClick={onMenuOpen} className="w-8 h-8 flex items-center justify-center -ml-1">
        <Menu className="w-5 h-5 text-foreground" />
      </button>
      {title && <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/notifications")} className="w-8 h-8 flex items-center justify-center relative">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full" />
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
