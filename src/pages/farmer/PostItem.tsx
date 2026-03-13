import { useState, useRef, useEffect } from "react";
import { Check, ImagePlus, X, Loader2 } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UpgradeModal from "@/components/UpgradeModal";
import { CATEGORIES } from "@/lib/categories";

const PostItem = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canCreateListing, plan, listingLimit, isLoading: subLoading } = useSubscription();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"form" | "images" | "done">("form");
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [countLoading, setCountLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    quantity: "",
    unit: ""
  });
  const [images, setImages] = useState<{file: File; preview: string;}[]>([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const checkCount = async () => {
      try {
        const { count, error } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("farmer_id", user.id)
          .eq("status", "active");
        if (!mounted) return;
        if (error) {
          console.error("[PostItem] Failed to fetch active count:", error.message);
          toast({ title: "Failed to load listing count", variant: "destructive" });
        }
        const c = count || 0;
        setActiveCount(c);
        console.log("[PostItem] Debug:", { userId: user.id, plan, listingLimit, activeCount: c, canCreate: canCreateListing(c) });
      } catch (e: unknown) {
        if (!mounted) return;
        console.error("[PostItem] Exception:", e instanceof Error ? e.message : e);
      } finally {
        if (mounted) setCountLoading(false);
      }
    };
    checkCount();
    return () => { mounted = false; };
  }, [user, plan, canCreateListing, listingLimit, toast]);

  // Cleanup image preview URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.slice(0, 6 - images.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(images[index].preview);
    setImages(images.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    if (subLoading || countLoading) return;
    if (!canCreateListing(activeCount)) {
      setShowUpgrade(true);
      return;
    }
    setStep("images");
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!canCreateListing(activeCount)) {
      setShowUpgrade(true);
      return;
    }

    setIsLoading(true);
    const uploadedUrls: string[] = [];
    const uploadedPaths: string[] = [];

    try {
      // Upload images
      for (const img of images) {
        const ext = img.file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, img.file);
        if (error) {
          throw new Error(`Image upload failed: ${error.message}`);
        }
        uploadedPaths.push(path);
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      // Insert product
      const { error } = await supabase.from("products").insert({
        farmer_id: user.id,
        title: form.name,
        description: form.description || null,
        category: form.category || null,
        price: parseFloat(form.price) || 0,
        stock: parseInt(form.quantity) || 0,
        unit: form.unit || "piece",
        images: uploadedUrls
      });

      if (error) {
        // Cleanup uploaded images if product insert fails
        for (const path of uploadedPaths) {
          await supabase.storage.from("product-images").remove([path]).catch(() => {});
        }
        throw new Error(`Product creation failed: ${error.message}`);
      }

      setStep("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An unexpected error occurred";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const limitDisplay = listingLimit === null ? "Unlimited" : String(listingLimit);
  const isDataReady = !subLoading && !countLoading;

  if (step === "done") {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Item Posted!</h2>
          <p className="text-sm text-muted-foreground">Your product is now live</p>
        </div>
        <div className="pb-8">
          <Button onClick={() => navigate("/my-store")} className="w-full rounded-full h-12 text-base font-semibold">
            Go to My Store
          </Button>
        </div>
      </MobileLayout>
    );
  }

  if (step === "images") {
    return (
      <MobileLayout>
        <PageHeader title="Add Photos" onBack={() => setStep("form")} />
        <div className="flex-1">
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden relative">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < 6 && (
              <button onClick={() => fileRef.current?.click()} className="aspect-square bg-muted rounded-lg flex items-center justify-center border border-border">
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="pb-8 pt-4">
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full rounded-full h-12 text-base font-semibold">
            {isLoading ? "Creating..." : "Create product for sell"}
          </Button>
        </div>
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </MobileLayout>
    );
  }

  const textFields = [
    { key: "name", label: "Item Title", placeholder: "e.g. Fresh Organic Eggs" },
    { key: "description", label: "Short Description", placeholder: "Describe your product" },
    { key: "price", label: "Price", placeholder: "e.g. 5.00" },
    { key: "quantity", label: "Available Quantity", placeholder: "e.g. 30" },
    { key: "unit", label: "Unit of Measure", placeholder: "e.g. dozen, kg, lb" }
  ];

  return (
    <MobileLayout>
      <PageHeader title="Post Item for Sell" />
      <div className="flex-1 space-y-5">
        {/* Listing limit indicator */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary">
          {!isDataReady ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading subscription...</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Active listings: <span className="font-semibold text-foreground">{activeCount}</span>
              {" / "}
              <span className="font-semibold text-foreground">{limitDisplay}</span>
            </span>
          )}
          {isDataReady && !canCreateListing(activeCount) && (
            <button onClick={() => setShowUpgrade(true)} className="text-xs font-semibold text-primary">
              Upgrade
            </button>
          )}
        </div>

        {/* Item Title */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block font-semibold">Item Title</label>
          <div className="border-b border-input pb-2">
            <input
              type="text"
              placeholder="e.g. Fresh Organic Eggs"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block font-semibold">Short Description</label>
          <div className="border-b border-input pb-2">
            <input
              type="text"
              placeholder="Describe your product"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Category Picker */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block font-semibold">Product Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = form.category === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setForm({ ...form, category: isActive ? "" : cat.key })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price, Quantity, Unit */}
        {textFields.filter((f) => f.key !== "name" && f.key !== "description").map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground mb-1 block font-semibold">{label}</label>
            <div className="border-b border-input pb-2">
              <input
                type={key === "price" ? "number" : "text"}
                step={key === "price" ? "0.01" : undefined}
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="pb-8 pt-4">
        <Button onClick={handleContinue} disabled={!form.name.trim() || !isDataReady} className="w-full rounded-full h-12 text-base font-semibold">
          {!isDataReady ? "Loading..." : "Continue"}
        </Button>
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </MobileLayout>
  );
};

export default PostItem;
