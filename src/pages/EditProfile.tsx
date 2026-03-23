import { useState, useRef, useEffect } from "react";
import { User, Mail, Phone, MapPin, FileText, Camera } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LocationPicker from "@/components/LocationPicker";

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
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Load existing coordinates
  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("latitude, longitude").eq("id", user.id).single()
        .then(({ data }) => {
          if (data?.latitude) setLatitude(data.latitude);
          if (data?.longitude) setLongitude(data.longitude);
        });
    }
  }, [user]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select an image under 8MB", variant: "destructive" });
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

    // Update profile including coordinates
    if (user) {
      await supabase.from("profiles").update({
        name, phone, location, bio, avatar_url,
        latitude, longitude,
      }).eq("id", user.id);

      await updateProfile({ name, phone, location, bio, avatar_url });
    }

    toast({ title: "Profile updated", description: "Your changes have been saved" });
    setIsLoading(false);
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const fields = [
    { icon: User, label: "Full Name", value: name, onChange: (v: string) => { if (v.length <= 30) setName(v); }, maxLength: 30, showCount: true },
    { icon: Mail, label: "Email Address", value: user?.email || "", onChange: () => {}, disabled: true },
    { icon: Phone, label: "Phone Number", value: phone, onChange: setPhone },
    { icon: MapPin, label: "Location", value: location, onChange: setLocation },
    { icon: FileText, label: "Bio", value: bio, onChange: (v: string) => { if (v.length <= 300) setBio(v); }, maxLength: 300, showCount: true },
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
          {fields.map(({ icon: Icon, label, value, onChange, disabled, maxLength, showCount }) => (
            <div key={label}>
              <div className="flex items-center gap-3 border-b border-input pb-3">
                <Icon className="w-5 h-5 text-muted-foreground" />
                {label === "Bio" ? (
                  <textarea
                    placeholder={label}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={maxLength}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground resize-none h-16"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={label}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    maxLength={maxLength}
                    className={`flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground ${disabled ? "text-muted-foreground" : ""}`}
                  />
                )}
              </div>
              {showCount && maxLength && (
                <p className="text-[10px] text-muted-foreground text-right mt-1">{value.length}/{maxLength}</p>
              )}
            </div>
          ))}

          {/* Map location picker */}
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
          />
        </div>
      </div>

      <div className="pb-8 pt-4">
        <Button onClick={handleSave} disabled={isLoading} className="w-full rounded-md h-12 text-base font-semibold">
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
    </MobileLayout>
  );
};

export default EditProfile;
