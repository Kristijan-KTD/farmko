import { useState, useEffect } from "react";
import { Trash2, Edit2, Package, Plus, Check, Loader2 } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  title: string;
  price: number;
  stock: number | null;
  unit: string;
  category: string | null;
  images: string[] | null;
}

const MyStore = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, stock, unit, category, images")
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setProducts(data);
      setLoading(false);
    };
    fetchProducts();
  }, [user]);

  const handleDelete = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts(products.filter((p) => p.id !== id));
    toast({ title: "Product deleted" });
  };

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setEditName(product.title);
    setEditPrice(String(product.price));
    setEditStock(String(product.stock || 0));
    setEditCategory(product.category || "");
  };

  const handleSaveEdit = async () => {
    if (!editProduct) return;
    const { error } = await supabase.from("products").update({
      title: editName,
      price: parseFloat(editPrice) || 0,
      stock: parseInt(editStock) || 0,
      category: editCategory || null,
    }).eq("id", editProduct.id);

    if (!error) {
      setProducts(products.map(p =>
        p.id === editProduct.id
          ? { ...p, title: editName, price: parseFloat(editPrice) || 0, stock: parseInt(editStock) || 0, category: editCategory || null }
          : p
      ));
      setEditProduct(null);
      toast({ title: "Product updated" });
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="My Store" rightAction={
        <button onClick={() => navigate("/post-item")} className="text-primary">
          <Plus className="w-5 h-5" />
        </button>
      } />

      <div className="flex-1 pb-20 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-4">No products yet</p>
            <Button onClick={() => navigate("/post-item")} className="rounded-full">
              Add Your First Product
            </Button>
          </div>
        ) : (
          products.map((product) => (
            <button
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card text-left hover:shadow-sm transition-shadow"
            >
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {product.images && product.images[0] ? (
                  <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{product.title}</h3>
                <p className="text-xs text-muted-foreground">{product.category || "Uncategorized"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-primary">${product.price.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">· {product.stock || 0} {product.unit}</span>
                </div>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(product); }}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                  className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </button>
          ))
        )}
      </div>

      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {[
              { label: "Product Name", value: editName, onChange: setEditName },
              { label: "Price", value: editPrice, onChange: setEditPrice },
              { label: "Stock", value: editStock, onChange: setEditStock },
              { label: "Category", value: editCategory, onChange: setEditCategory },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="space-y-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border-b border-input bg-transparent text-sm outline-none pb-2 focus:border-primary" />
              </div>
            ))}
            <Button onClick={handleSaveEdit} className="w-full rounded-full h-11">
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </MobileLayout>
  );
};

export default MyStore;
