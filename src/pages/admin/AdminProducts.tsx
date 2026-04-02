import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, ShoppingBag, User, AlertTriangle } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import { adminService } from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { AdminProduct } from "@/types/admin";

const PAGE_SIZE = 20;

const AdminProducts = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "sold">("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminService.getAllProducts();
      if (signal?.aborted) return;
      setProducts(data ?? []);
    } catch {
      if (signal?.aborted) return;
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  const filtered = useMemo(() => {
    let list = products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title?.toLowerCase().includes(q) || p.farmer?.name?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      list = list.filter(p => p.status === statusFilter);
    }
    return list;
  }, [products, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.removeProduct(deleteTarget.id);
      toast({ title: "Product removed" });
      setDeleteTarget(null);
      await fetchProducts();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (productId: string, newStatus: string) => {
    try {
      await adminService.updateProductStatus(productId, newStatus);
      toast({ title: `Product marked as ${newStatus}` });
      await fetchProducts();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  return (
    <AdminGuard>
      <AdminLayout title="Products Management">
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by title or farmer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "active", "sold"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : error ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-muted-foreground">Failed to load products</p>
            <Button variant="outline" onClick={() => fetchProducts()} className="gap-2"><RefreshCw className="w-4 h-4" /> Retry</Button>
          </div>
        ) : paged.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No products match your filters</p>
        ) : (
          <>
            <div className="space-y-3">
              {paged.map((product) => (
                <div key={product.id} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{product.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">by {product.farmer?.name ?? "Unknown"}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          product.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                        }`}>
                          {product.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ${product.price}/{product.unit} · {product.category ?? "Uncategorized"} · {new Date(product.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {product.status === "active" ? (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(product.id, "sold")} className="rounded-full text-xs h-8">
                          Mark Sold
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(product.id, "active")} className="rounded-full text-xs h-8">
                          Reactivate
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(product)} className="rounded-full text-xs h-8">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm text-muted-foreground">Page {safePage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center mt-2">{filtered.length} product{filtered.length !== 1 ? "s" : ""} total</p>
          </>
        )}

        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Remove Product</DialogTitle>
              <DialogDescription>
                This will permanently delete "{deleteTarget?.title}". This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-full">Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1 rounded-full">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminProducts;
