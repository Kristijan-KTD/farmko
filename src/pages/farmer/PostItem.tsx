import { useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PostItem = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "images" | "done">("form");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    quantity: "",
    unit: "",
  });

  if (step === "done") {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Item Posted!</h2>
          <p className="text-sm text-muted-foreground">Your product is now ready for sell</p>
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
        <PageHeader title="Select Photos" onBack={() => setStep("form")} />
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center border border-border">
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
        <div className="pb-8 pt-4">
          <Button onClick={() => setStep("done")} className="w-full rounded-full h-12 text-base font-semibold">
            Create product for sell
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const fields = [
    { key: "name", label: "Item Title", placeholder: "e.g. Fresh Organic Eggs" },
    { key: "description", label: "Short Description", placeholder: "Describe your product" },
    { key: "category", label: "Product Category", placeholder: "e.g. Dairy, Vegetables" },
    { key: "price", label: "Expected Price", placeholder: "e.g. $5.00" },
    { key: "quantity", label: "Available Quantity", placeholder: "e.g. 30" },
    { key: "unit", label: "Unit of Measure", placeholder: "e.g. dozen, kg, lb" },
  ];

  return (
    <MobileLayout>
      <PageHeader title="Post Item for Sell" />
      <div className="flex-1 space-y-5">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
            <div className="border-b border-input pb-2">
              <input
                type="text"
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
        <Button onClick={() => setStep("images")} className="w-full rounded-full h-12 text-base font-semibold">
          Continue
        </Button>
      </div>
    </MobileLayout>
  );
};

export default PostItem;
