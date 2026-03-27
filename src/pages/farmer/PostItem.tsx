import { useState, useRef, useEffect } from "react";
import { Check, ImagePlus, X, Loader2, ChevronRight } from "lucide-react";
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
  const [step, setStep] = useState<1 | 2 | "done">(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [countLoading, setCountLoading] = useState(true);
  const UNIT_OPTIONS = [
    { key: "lbs", label: "lbs" },
    { key: "g", label: "g" },
    { key: "oz", label: "oz" },
    { key: "kg", label: "kg" },
    { key: "l", label: "l" },
    { key: "ml", label: "ml" },
    { key: "dozen", label: "dozen" },
    { key: "piece", label: "piece" },
  ];

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    quantity: "",
    unit: "",
    pickupAvailable: false,
    deliveryAvailable: false,
  });
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        if (error) toast({ title: "Failed to load listing count", variant: "destructive" });
        setActiveCount(count || 0);
      } catch {
        // silent
      } finally {
        if (mounted) setCountLoading(false);
      }
    };
    checkCount();
    return () => { mounted = false; };
  }, [user, plan, canCreateListing, listingLimit, toast]);

  useEffect(() => {
    return () => { images.forEach(img => URL.revokeObjectURL(img.preview)); };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 8 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 8MB limit`, variant: "destructive" });
        return false;
      }
      return true;
    });
    const maxImages = plan === "pro" ? 6 : plan === "growth" ? 3 : 1;
    const newImages = validFiles.slice(0, maxImages - images.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(images[index].preview);
    setImages(images.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Title is required";
    if (form.name.length > 30) newErrors.name = "Max 30 characters";
    if (!form.category) newErrors.category = "Category is required";
    if (!form.price || parseFloat(form.price) <= 0) newErrors.price = "Enter a valid price";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.quantity || parseInt(form.quantity) <= 0) newErrors.quantity = "Enter a valid quantity";
    if (!form.unit) newErrors.unit = "Select a unit";
    if (form.description.length > 300) newErrors.description = "Max 300 characters";
    if (images.length === 0) newErrors.images = "Add at least one photo";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToStep2 = () => {
    if (subLoading || countLoading) return;
    if (!canCreateListing(activeCount)) {
      setShowUpgrade(true);
      return;
    }
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!canCreateListing(activeCount)) {
      setShowUpgrade(true);
      return;
    }
    if (!validateStep2()) return;

    setIsLoading(true);
    const uploadedUrls: string[] = [];
    const uploadedPaths: string[] = [];

    try {
      for (const img of images) {
        const ext = img.file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, img.file);
        if (error) throw new Error(`Image upload failed: ${error.message}`);
        uploadedPaths.push(path);
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

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
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-elevated">
            <Check className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Product Published!</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">Your product is now live and visible to customers nearby.</p>
          </div>
        </div>
        <div className="pb-8 space-y-3 px-3">
          <Button onClick={() => navigate("/my-store")} className="w-full rounded-md h-12 text-base font-semibold shadow-card">
            Go to My Store
          </Button>
          <Button variant="outline" onClick={() => { setStep(1); setForm({ name: "", description: "", category: "", price: "", quantity: "", unit: "" }); setImages([]); }} className="w-full rounded-md h-12 text-base">
            Post Another
          </Button>
        </div>
      </MobileLayout>
    );
  }

  if (step === 2) {
    return (
      <MobileLayout>
        <PageHeader title="Details & Photos" onBack={() => setStep(1)} />
        <div className="flex-1 section-gap">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-primary" />
            <div className="flex-1 h-1.5 rounded-full bg-primary" />
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-semibold">Available Quantity *</label>
            <div className={`border-b pb-2 ${errors.quantity ? "border-destructive" : "border-input"}`}>
              <input
                type="number"
                placeholder="e.g. 30"
                value={form.quantity}
                onChange={(e) => { setForm({ ...form, quantity: e.target.value }); setErrors(prev => ({ ...prev, quantity: "" })); }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {errors.quantity && <p className="text-[11px] text-destructive mt-1">{errors.quantity}</p>}
          </div>

          {/* Unit of Measure - capsule style */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-semibold">Unit of Measure *</label>
            <div className="flex flex-wrap gap-2">
              {UNIT_OPTIONS.map((u) => {
                const isActive = form.unit === u.key;
                return (
                  <button
                    key={u.key}
                    type="button"
                    onClick={() => { setForm({ ...form, unit: isActive ? "" : u.key }); setErrors(prev => ({ ...prev, unit: "" })); }}
                    className={`flex items-center px-3.5 py-2 rounded-full border text-xs transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {u.label}
                  </button>
                );
              })}
            </div>
            {errors.unit && <p className="text-[11px] text-destructive mt-1">{errors.unit}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-semibold">Description</label>
            <textarea
              placeholder="Describe your product..."
              value={form.description}
              onChange={(e) => { if (e.target.value.length <= 300) setForm({ ...form, description: e.target.value }); }}
              className="w-full bg-secondary rounded-lg p-3 text-sm outline-none resize-none h-20 placeholder:text-muted-foreground"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{form.description.length}/300</p>
            {errors.description && <p className="text-[11px] text-destructive mt-1">{errors.description}</p>}
          </div>

          {/* Images */}
          <div>
            {(() => { const maxImg = plan === "pro" ? 6 : plan === "growth" ? 3 : 1; return (
              <>
                <label className="text-xs text-muted-foreground mb-2 block font-semibold">Photos (up to {maxImg}) *</label>
                {errors.images && <p className="text-[11px] text-destructive mb-2">{errors.images}</p>}
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="aspect-square rounded-md overflow-hidden relative shadow-card">
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length < maxImg && (
                    <button onClick={() => fileRef.current?.click()} className="aspect-square bg-muted rounded-md flex items-center justify-center border-2 border-dashed border-border hover:border-primary/30 transition-colors">
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </>
            ); })()}
          </div>
        </div>
        <div className="pb-8 pt-4">
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full rounded-md h-12 text-base font-semibold shadow-card">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publishing...</> : "Publish Product"}
          </Button>
        </div>
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </MobileLayout>
    );
  }

  // Step 1: Basic Info
  return (
    <MobileLayout>
      <PageHeader title="Post Item for Sell" />
      <div className="flex-1 section-gap">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-primary" />
          <div className="flex-1 h-1.5 rounded-full bg-muted" />
        </div>

        {/* Listing limit */}
        <div className="flex items-center justify-between p-3.5 rounded-md bg-secondary/80 border border-border">
          {!isDataReady ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Listings: <span className="font-semibold text-foreground">{activeCount}</span> / <span className="font-semibold text-foreground">{limitDisplay}</span>
            </span>
          )}
          {isDataReady && !canCreateListing(activeCount) && (
            <button onClick={() => setShowUpgrade(true)} className="text-xs font-semibold text-primary">Upgrade</button>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block font-semibold">Item Title *</label>
          <div className={`border-b pb-2 ${errors.name ? "border-destructive" : "border-input"}`}>
            <input
              type="text"
              placeholder="e.g. Fresh Organic Eggs"
              value={form.name}
              maxLength={30}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(prev => ({ ...prev, name: "" })); }}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            {errors.name ? <p className="text-[11px] text-destructive">{errors.name}</p> : <span />}
            <p className="text-[10px] text-muted-foreground">{form.name.length}/30</p>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block font-semibold">Category *</label>
          {errors.category && <p className="text-[11px] text-destructive mb-1">{errors.category}</p>}
          <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter(c => c.key !== "all").map((cat) => {
              const Icon = cat.icon;
              const isActive = form.category === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => { setForm({ ...form, category: isActive ? "" : cat.key }); setErrors(prev => ({ ...prev, category: "" })); }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs transition-all ${
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

        {/* Price */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block font-semibold">Price *</label>
          <div className={`border-b pb-2 ${errors.price ? "border-destructive" : "border-input"}`}>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 5.00"
              value={form.price}
              onChange={(e) => { setForm({ ...form, price: e.target.value }); setErrors(prev => ({ ...prev, price: "" })); }}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {errors.price && <p className="text-[11px] text-destructive mt-1">{errors.price}</p>}
        </div>
      </div>
      <div className="pb-8 pt-4">
        <Button onClick={handleContinueToStep2} disabled={!isDataReady} className="w-full rounded-md h-12 text-base font-semibold gap-2 shadow-card">
          Continue <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </MobileLayout>
  );
};

export default PostItem;
