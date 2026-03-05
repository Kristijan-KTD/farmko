import { useState } from "react";
import { User, Mail, Phone, MapPin, FileText } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const EditProfile = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [bio, setBio] = useState(user?.bio || "");

  const handleSave = () => {
    updateProfile({ name, email, phone, location, bio });
  };

  const fields = [
    { icon: User, label: "Full Name", value: name, onChange: setName },
    { icon: Mail, label: "Email Address", value: email, onChange: setEmail },
    { icon: Phone, label: "Phone Number", value: phone, onChange: setPhone },
    { icon: MapPin, label: "Location", value: location, onChange: setLocation },
    { icon: FileText, label: "Bio", value: bio, onChange: setBio },
  ];

  return (
    <MobileLayout>
      <PageHeader title="Edit Profile" />

      <div className="flex-1">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-xs">✎</span>
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {fields.map(({ icon: Icon, label, value, onChange }) => (
            <div key={label} className="flex items-center gap-3 border-b border-input pb-3">
              <Icon className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pb-8 pt-4">
        <Button onClick={handleSave} className="w-full rounded-full h-12 text-base font-semibold">
          Save
        </Button>
      </div>
    </MobileLayout>
  );
};

export default EditProfile;
