import { useState, useRef } from "react";
import { User, Mail, Phone, MapPin, FileText, Camera } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EditProfile = () => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter your full name", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    let avatar_url = user?.avatar_url || null;

    // Upload avatar if changed
    if (avatarFile && user) {
      const ext = avatarFile.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (!uploadErr) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatar_url = data.publicUrl;
      }
    }

    await updateProfile({ name, phone, location, bio, avatar_url });
    toast({ title: "Profile updated", description: "Your changes have been saved" });
    setIsLoading(false);
  };

  const fields = [
    { icon: User, label: "Full Name", value: name, onChange: setName },
    { icon: Mail, label: "Email Address", value: user?.email || "", onChange: () => {} , disabled: true },
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
          {fields.map(({ icon: Icon, label, value, onChange, disabled }) => (
            <div key={label} className="flex items-center gap-3 border-b border-input pb-3">
              <Icon className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={`flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground ${disabled ? "text-muted-foreground" : ""}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pb-8 pt-4">
        <Button onClick={handleSave} disabled={isLoading} className="w-full rounded-full h-12 text-base font-semibold">
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
    </MobileLayout>
  );
};

export default EditProfile;
