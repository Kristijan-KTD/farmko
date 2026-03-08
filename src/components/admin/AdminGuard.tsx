import { ReactNode } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AdminGuard = ({ children }: { children: ReactNode }) => {
  const { isAdmin, isLoading } = useAdmin();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground text-center">
          You don't have admin privileges to access this page.
        </p>
        <Button onClick={() => navigate("/home")} variant="outline" className="rounded-full">
          Go Home
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
