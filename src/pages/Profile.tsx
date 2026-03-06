import { User, MapPin, Mail, Phone } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <MobileLayout>
      <PageHeader title="Profile" />

      <div className="flex-1 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4 overflow-hidden">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-muted-foreground" />
          )}
        </div>
        <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
        <p className="text-sm text-primary capitalize mb-2">{user?.role}</p>
        
        <div className="w-full mt-6 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-foreground">{user?.email}</span>
          </div>
          {user?.phone && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{user.phone}</span>
            </div>
          )}
          {user?.location && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{user.location}</span>
            </div>
          )}
          {user?.bio && (
            <p className="text-sm text-muted-foreground px-3">{user.bio}</p>
          )}
        </div>
      </div>

      <div className="pb-8 pt-4">
        <Button onClick={() => navigate("/edit-profile")} className="w-full rounded-full h-12 text-base font-semibold">
          Edit Profile
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Profile;
