import { useState } from "react";
import { Trash2, Edit2, Package } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";

const mockProducts = [
  { id: 1, name: "Organic Eggs", price: "$5.00", quantity: "30 dozen", category: "Dairy" },
  { id: 2, name: "Fresh Tomatoes", price: "$3.50", quantity: "20 kg", category: "Vegetables" },
  { id: 3, name: "Raw Honey", price: "$12.00", quantity: "10 jars", category: "Other" },
  { id: 4, name: "Free-range Chicken", price: "$15.00", quantity: "5 pcs", category: "Meat" },
];

const MyStore = () => {
  const [products, setProducts] = useState(mockProducts);

  const handleDelete = (id: number) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  return (
    <MobileLayout>
      <PageHeader title="My Store" />

      <div className="flex-1 pb-20 space-y-3">
        {products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No products yet</p>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
            >
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{product.name}</h3>
                <p className="text-xs text-muted-foreground">{product.category}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-primary">{product.price}</span>
                  <span className="text-xs text-muted-foreground">· {product.quantity}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-muted-foreground hover:text-foreground">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default MyStore;
