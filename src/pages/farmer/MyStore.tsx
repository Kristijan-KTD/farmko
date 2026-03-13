import { useState, useEffect } from "react";
import { Trash2, Edit2, Package, Plus, Check, Loader2, AlertTriangle } from "lucide-react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  title: string;
  price: number;
  stock: number | null;
  unit: string;
  category: string | null;
  images: string[] | null;
  status: string;
}

const MyStore = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, title, price, stock, unit, category, images, status")
          .eq("farmer_id", user.id)
          .order("created_at", { ascending: false });
        if (!mounted) return;
        if (error) throw error;
        setProducts(data || []);
        setFetchError(false);
      } catch (e: unknown) {
        if (!mounted) return;
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("[MyStore] Fetch error:", msg);
        toast({ title: "Failed to load products", description: msg, variant: "destructive" });
        setFetchError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProducts();
    return () => { mounted = false; };
  }, [user, toast]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteId);
      if (error) throw error;
      setProducts(products.filter((p) => p.id !== deleteId));
      toast({ title: "Product deleted" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast({ title: "Failed to delete", description: msg, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
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

    // Validation
    if (!editName.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) {
      toast({ title: "Price must be 0 or more", variant: "destructive" });
      return;
    }
    const stock = parseInt(editStock);
    if (isNaN(stock) || stock < 0) {
      toast({ title: "Stock must be 0 or more", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("products").update({
        title: editName.trim(),
        price,
        stock,
        category: editCategory || null,
      }).eq("id", editProduct.id);

      if (error) throw error;

      setProducts(products.map(p =>
        p.id === editProduct.id
          ? { ...p, title: editName.trim(), price, stock, category: editCategory || null }
          : p
      ));
      setEditProduct(null);
      toast({ title: "Product updated" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast({ title: "Failed to update", description: msg, variant: "destructive" });
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
        ) : fetchError ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <AlertTriangle className="w-12 h-12 text-destructive/50 mb-4" />
            <p className="text-muted-foreground mb-4">Failed to load products</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="rounded-full">
              Retry
            </Button>
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
                  onClick={(e) => { e.stopPropagation(); setDeleteId(product.id); }}
                  className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
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
