import { useState } from "react";
import { Trash2, Edit2, Package, Plus, X, Check } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const initialProducts = [
  { id: 1, name: "Organic Eggs", price: "$5.00", quantity: "30 dozen", category: "Dairy" },
  { id: 2, name: "Fresh Tomatoes", price: "$3.50", quantity: "20 kg", category: "Vegetables" },
  { id: 3, name: "Raw Honey", price: "$12.00", quantity: "10 jars", category: "Other" },
  { id: 4, name: "Free-range Chicken", price: "$15.00", quantity: "5 pcs", category: "Meat" },
];

const MyStore = () => {
  const [products, setProducts] = useState(initialProducts);
  const [editProduct, setEditProduct] = useState<typeof initialProducts[0] | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    setProducts(products.filter((p) => p.id !== id));
    toast({ title: "Product deleted", description: "The product has been removed from your store" });
  };

  const openEdit = (product: typeof initialProducts[0]) => {
    setEditProduct(product);
    setEditName(product.name);
    setEditPrice(product.price);
    setEditQuantity(product.quantity);
    setEditCategory(product.category);
  };

  const handleSaveEdit = () => {
    if (!editProduct) return;
    setProducts(products.map(p =>
      p.id === editProduct.id
        ? { ...p, name: editName, price: editPrice, quantity: editQuantity, category: editCategory }
        : p
    ));
    setEditProduct(null);
    toast({ title: "Product updated", description: "Changes saved successfully" });
  };

  return (
    <MobileLayout>
      <PageHeader title="My Store" rightAction={
        <button onClick={() => navigate("/post-item")} className="text-primary">
          <Plus className="w-5 h-5" />
        </button>
      } />

      <div className="flex-1 pb-20 space-y-3">
        {products.length === 0 ? (
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

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Product Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full border-b border-input bg-transparent text-sm outline-none pb-2 focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Price</label>
              <input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full border-b border-input bg-transparent text-sm outline-none pb-2 focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Quantity</label>
              <input
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                className="w-full border-b border-input bg-transparent text-sm outline-none pb-2 focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Category</label>
              <input
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full border-b border-input bg-transparent text-sm outline-none pb-2 focus:border-primary"
              />
            </div>
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
