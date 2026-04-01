import { useState, useEffect } from "react";
import { Trash2, Package, Plus, Check, Loader2, AlertTriangle, Eye, Heart, MessageCircle, ArrowUpDown } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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
  created_at: string;
}

interface ProductStats {
  views: number;
  favorites: number;
  contacts: number;
}

type SortBy = "newest" | "most_viewed";

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
  const [productStats, setProductStats] = useState<Map<string, ProductStats>>(new Map());
  const [sortBy, setSortBy] = useState<SortBy>("newest");
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
          .select("id, title, price, stock, unit, category, images, status, created_at")
          .eq("farmer_id", user.id)
          .order("created_at", { ascending: false });
        if (!mounted) return;
        if (error) throw error;
        setProducts(data || []);

        if (data && data.length > 0) {
          const productIds = data.map(p => p.id);
          const { data: events } = await supabase
            .from("analytics_events")
            .select("event_type, listing_id")
            .eq("farmer_id", user.id)
            .in("listing_id", productIds);

          const statsMap = new Map<string, ProductStats>();
          productIds.forEach(id => statsMap.set(id, { views: 0, favorites: 0, contacts: 0 }));
          (events || []).forEach(e => {
            if (!e.listing_id) return;
            const s = statsMap.get(e.listing_id);
            if (!s) return;
            if (e.event_type === "listing_view") s.views++;
            else if (e.event_type === "favorite_listing") s.favorites++;
            else if (e.event_type === "contact_farmer") s.contacts++;
          });
          if (mounted) setProductStats(statsMap);
        }

        setFetchError(false);
      } catch (e: unknown) {
        if (!mounted) return;
        toast({ title: "Failed to load products", variant: "destructive" });
        setFetchError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProducts();
    return () => { mounted = false; };
  }, [user, toast]);

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === "most_viewed") {
      return (productStats.get(b.id)?.views ?? 0) - (productStats.get(a.id)?.views ?? 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteId);
      if (error) throw error;
      setProducts(products.filter((p) => p.id !== deleteId));
      toast({ title: "Product deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
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
    if (!editName.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) { toast({ title: "Price must be 0 or more", variant: "destructive" }); return; }
    const stock = parseInt(editStock);
    if (isNaN(stock) || stock < 0) { toast({ title: "Stock must be 0 or more", variant: "destructive" }); return; }

    try {
      const { error } = await supabase.from("products").update({
        title: editName.trim(), price, stock, category: editCategory || null,
      }).eq("id", editProduct.id);
      if (error) throw error;

      setProducts(products.map(p =>
        p.id === editProduct.id ? { ...p, title: editName.trim(), price, stock, category: editCategory || null } : p
      ));
      setEditProduct(null);
      toast({ title: "Product updated" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="My Store" rightAction={
        <button onClick={() => navigate("/post-item")} className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
          <Plus className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
        </button>
      } />

      <div className="flex-1 pb-20 section-gap">
        {/* Sort control */}
        {products.length > 1 && !loading && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{products.length} products</span>
            <button
              onClick={() => setSortBy(sortBy === "newest" ? "most_viewed" : "newest")}
              className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/8 px-3 py-1.5 rounded-lg"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortBy === "newest" ? "Newest" : "Most viewed"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-destructive/8 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive/60" />
            </div>
            <p className="text-foreground font-medium mb-1">Something went wrong</p>
            <p className="text-muted-foreground text-sm mb-4">Failed to load products</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="rounded-md">Retry</Button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="w-9 h-9 text-muted-foreground/30" />
            </div>
            <p className="text-foreground font-medium mb-1">No products yet</p>
            <p className="text-sm text-muted-foreground mb-5 text-center max-w-[240px]">Start selling by adding your first item to your store.</p>
            <Button onClick={() => navigate("/post-item")} className="rounded-md px-6">Add Your First Product</Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedProducts.map((product) => {
              const stats = productStats.get(product.id);
              return (
                <div key={product.id} className="card-interactive flex items-center gap-3 p-3.5">
                  <button
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0"
                  >
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground/30" />
                    )}
                  </button>
                  <button onClick={() => navigate(`/product/${product.id}`)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">{product.title}</h3>
                      <span className={`text-[9px] px-2 py-0.5 rounded-lg font-medium ${
                        product.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {product.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-primary">${product.price.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">· {product.stock || 0} {product.unit}</span>
                    </div>
                    {stats && (
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" />{stats.views}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3" />{stats.favorites}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MessageCircle className="w-3 h-3" />{stats.contacts}</span>
                      </div>
                    )}
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => setDeleteId(product.id)} className="p-2.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
             <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent className="rounded-lg">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          <div className="space-y-5 pt-2">
            {[
              { label: "Product Name", value: editName, onChange: setEditName },
              { label: "Price", value: editPrice, onChange: setEditPrice },
              { label: "Stock", value: editStock, onChange: setEditStock },
              { label: "Category", value: editCategory, onChange: setEditCategory },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border-b border-input bg-transparent text-sm outline-none pb-2 focus:border-primary transition-colors" />
              </div>
            ))}
            <Button onClick={handleSaveEdit} className="w-full rounded-md h-11">
              <Check className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </MobileLayout>
  );
};

export default MyStore;
