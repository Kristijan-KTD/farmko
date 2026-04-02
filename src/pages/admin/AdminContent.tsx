import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, Camera, User, AlertTriangle, ExternalLink } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import { adminService } from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { AdminInstafarmPost } from "@/types/admin";

const PAGE_SIZE = 20;

const AdminContent = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<AdminInstafarmPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminInstafarmPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPosts = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminService.getAllInstafarmPosts();
      if (signal?.aborted) return;
      setPosts(data ?? []);
    } catch {
      if (signal?.aborted) return;
      toast({ title: "Error", description: "Failed to load posts", variant: "destructive" });
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPosts(controller.signal);
    return () => controller.abort();
  }, [fetchPosts]);

  const filtered = useMemo(() => {
    if (!search) return posts;
    const q = search.toLowerCase();
    return posts.filter(p =>
      p.caption?.toLowerCase().includes(q) ||
      p.farmer?.name?.toLowerCase().includes(q) ||
      p.product?.title?.toLowerCase().includes(q)
    );
  }, [posts, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteInstafarmPost(deleteTarget.id);
      toast({ title: "Post deleted" });
      setDeleteTarget(null);
      await fetchPosts();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminGuard>
      <AdminLayout title="Content Moderation">
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by caption, farmer, or product..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : error ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-muted-foreground">Failed to load posts</p>
            <Button variant="outline" onClick={() => fetchPosts()} className="gap-2"><RefreshCw className="w-4 h-4" /> Retry</Button>
          </div>
        ) : paged.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No posts found</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paged.map((post) => (
                <div key={post.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="aspect-square bg-muted relative">
                    <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                    {post.product && (
                      <button
                        onClick={() => navigate(`/product/${post.product!.id}`)}
                        className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> {post.product.title}
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {post.farmer?.avatar_url ? (
                          <img src={post.farmer.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-foreground truncate">{post.farmer?.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    {post.caption && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{post.caption}</p>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(post)} className="w-full rounded-full text-xs h-8">
                      <Trash2 className="w-3 h-3 mr-1" /> Delete Post
                    </Button>
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
            <p className="text-xs text-muted-foreground text-center mt-2">{filtered.length} post{filtered.length !== 1 ? "s" : ""} total</p>
          </>
        )}

        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Delete Post</DialogTitle>
              <DialogDescription>
                This will permanently delete this Instafarm post and all its likes/comments. This action cannot be undone.
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

export default AdminContent;
