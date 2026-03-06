import { useState, useRef } from "react";
import { User, Mail, Phone, MapPin, FileText, Camera } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const EditProfile = () => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatarPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter your full name", variant: "destructive" });
      return;
    }
    updateProfile({ name, email, phone, location, bio, avatar: avatarPreview });
    toast({ title: "Profile updated", description: "Your changes have been saved" });
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
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md"
            >
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
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
