import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Heart, MessageCircle, Grid, Image as ImageIcon, MoreHorizontal, Loader2, Camera, AlertTriangle, Package, ExternalLink } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user: { name: string; avatar_url: string | null } | null;
}

interface TaggedProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
}

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  farmer_id: string;
  product_id: string | null;
  farmer: { name: string; avatar_url: string | null } | null;
  tagged_product: TaggedProduct | null;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

interface FarmerProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
}

const Instafarm = () => {
  const [view, setView] = useState<"grid" | "feed">("grid");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [farmerProducts, setFarmerProducts] = useState<FarmerProduct[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch farmer's products for tagging
  useEffect(() => {
    if (!user || user.role !== "farmer") return;
    supabase
      .from("products")
      .select("id, title, price, images")
      .eq("farmer_id", user.id)
      .eq("status", "active")
      .then(({ data }) => {
        if (data) setFarmerProducts(data);
      });
  }, [user]);

  const fetchPosts = useCallback(async () => {
    try {
      const { data: postsData, error } = await supabase
        .from("instafarm_posts")
        .select("id, image_url, caption, created_at, farmer_id, product_id, farmer:profiles!instafarm_posts_farmer_id_fkey(name, avatar_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        setFetchError(false);
        return;
      }

      const postIds = postsData.map(p => p.id);
      const productIds = postsData.map(p => p.product_id).filter(Boolean) as string[];

      const [likesRes, commentCountsRes, productsRes] = await Promise.all([
        supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
        supabase.from("post_comments").select("post_id").in("post_id", postIds),
        productIds.length > 0
          ? supabase.from("products").select("id, title, price, images").in("id", productIds)
          : Promise.resolve({ data: [] }),
      ]);

      const likesMap = new Map<string, { count: number; userLiked: boolean }>();
      (likesRes.data ?? []).forEach(l => {
        const entry = likesMap.get(l.post_id) || { count: 0, userLiked: false };
        entry.count++;
        if (l.user_id === user?.id) entry.userLiked = true;
        likesMap.set(l.post_id, entry);
      });

      const commentsMap = new Map<string, number>();
      (commentCountsRes.data ?? []).forEach(c => commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1));

      const productMap = new Map<string, TaggedProduct>();
      (productsRes.data ?? []).forEach((p: any) => productMap.set(p.id, p));

      setPosts(postsData.map(p => ({
        ...p,
        farmer: Array.isArray(p.farmer) ? p.farmer[0] ?? null : p.farmer,
        tagged_product: p.product_id ? productMap.get(p.product_id) || null : null,
        likes_count: likesMap.get(p.id)?.count || 0,
        comments_count: commentsMap.get(p.id) || 0,
        user_liked: likesMap.get(p.id)?.userLiked || false,
      })));
      setFetchError(false);
    } catch (e: unknown) {
      console.error("[Instafarm] Fetch error:", e instanceof Error ? e.message : e);
      toast({ title: "Failed to load posts", variant: "destructive" });
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.user_liked;
    setPosts(posts.map(p =>
      p.id === postId
        ? { ...p, user_liked: !wasLiked, likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    ));

    try {
      if (wasLiked) {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    } catch {
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, user_liked: wasLiked, likes_count: wasLiked ? p.likes_count : p.likes_count - 1 }
          : p
      ));
      toast({ title: "Failed to update like", variant: "destructive" });
    }
  };

  const openComments = async (post: Post) => {
    setSelectedPost(post);
    setShowComments(true);
    setCommentsLoading(true);

    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, text, created_at, user:profiles!post_comments_user_id_fkey(name, avatar_url)")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments((data ?? []).map(c => ({ ...c, user: Array.isArray(c.user) ? c.user[0] ?? null : c.user })));
    } catch {
      toast({ title: "Failed to load comments", variant: "destructive" });
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const addComment = async () => {
    if (!commentText.trim() || !selectedPost || !user) return;
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({ post_id: selectedPost.id, user_id: user.id, text: commentText })
        .select("id, text, created_at")
        .single();

      if (error) throw error;
      if (data) {
        setComments([...comments, { ...data, user: { name: user.name, avatar_url: user.avatar_url || null } }]);
        setPosts(posts.map(p => p.id === selectedPost.id ? { ...p, comments_count: p.comments_count + 1 } : p));
        setCommentText("");
      }
    } catch {
      toast({ title: "Failed to post comment", variant: "destructive" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setUploadFile(file);
    const previewUrl = URL.createObjectURL(file);
    setUploadPreview(previewUrl);
    setShowUpload(true);
  };

  const closeUploadDialog = () => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setShowUpload(false);
    setUploadFile(null);
    setUploadPreview("");
    setCaption("");
    setSelectedProductId("");
  };

  const handleUploadPost = async () => {
    if (!uploadFile || !user || uploading) return;
    setUploading(true);

    try {
      const ext = uploadFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("instafarm-photos").upload(filePath, uploadFile);

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage.from("instafarm-photos").getPublicUrl(filePath);

      const { error: insertErr } = await supabase.from("instafarm_posts").insert({
        farmer_id: user.id,
        image_url: urlData.publicUrl,
        caption: caption || null,
        product_id: selectedProductId || null,
      });

      if (insertErr) throw new Error(insertErr.message);

      closeUploadDialog();
      toast({ title: "Post shared!" });
      fetchPosts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const totalLikes = posts.reduce((a, p) => a + p.likes_count, 0);
  const totalComments = posts.reduce((a, p) => a + p.comments_count, 0);

  const ProductTag = ({ product }: { product: TaggedProduct }) => (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
      className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border hover:shadow-sm transition-shadow w-full text-left"
    >
      <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <Package className="w-4 h-4 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{product.title}</p>
        <p className="text-xs font-bold text-primary">${product.price.toFixed(2)}</p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </button>
  );

  return (
    <MobileLayout>
      <PageHeader title="Instafarm" rightAction={
        user?.role === "farmer" ? (
          <button className="text-primary" onClick={() => fileRef.current?.click()}>
            <Plus className="w-5 h-5" />
          </button>
        ) : undefined
      } />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {/* Stats bar */}
      <div className="flex items-center justify-around py-3 mb-2 border-b border-border">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{posts.length}</p>
          <p className="text-[10px] text-muted-foreground">Posts</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{totalLikes}</p>
          <p className="text-[10px] text-muted-foreground">Likes</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{totalComments}</p>
          <p className="text-[10px] text-muted-foreground">Comments</p>
        </div>
      </div>

      <div className="flex gap-4 mb-4 border-b border-border">
        <button onClick={() => setView("grid")} className={`pb-3 px-2 text-sm font-medium transition-colors ${view === "grid" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
          <Grid className="w-5 h-5" />
        </button>
        <button onClick={() => setView("feed")} className={`pb-3 px-2 text-sm font-medium transition-colors ${view === "feed" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
          <ImageIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="w-12 h-12 text-destructive/50 mb-4" />
            <p className="text-muted-foreground text-sm mb-4">Failed to load posts</p>
            <Button variant="outline" onClick={() => { setLoading(true); fetchPosts(); }} className="rounded-full">Retry</Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Camera className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No posts yet</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
              <button key={post.id} onClick={() => openComments(post)} className="aspect-square bg-muted rounded-sm flex items-center justify-center relative group overflow-hidden">
                <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                {post.tagged_product && (
                  <div className="absolute top-1.5 left-1.5 bg-primary/90 rounded-full p-1">
                    <Package className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-sm">
                  <span className="flex items-center gap-1 text-white text-xs font-medium">
                    <Heart className="w-4 h-4 fill-white" /> {post.likes_count}
                  </span>
                  <span className="flex items-center gap-1 text-white text-xs font-medium">
                    <MessageCircle className="w-4 h-4 fill-white" /> {post.comments_count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {post.farmer?.avatar_url ? (
                        <img src={post.farmer.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">{post.farmer?.name?.[0] || "?"}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{post.farmer?.name ?? "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</p>
                    </div>
                  </div>
                  <button className="text-muted-foreground"><MoreHorizontal className="w-5 h-5" /></button>
                </div>

                <div className="aspect-square bg-muted rounded-md overflow-hidden">
                  <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleLike(post.id)} className={`transition-colors ${post.user_liked ? "text-red-500" : "text-muted-foreground"}`}>
                      <Heart className={`w-6 h-6 ${post.user_liked ? "fill-red-500" : ""}`} />
                    </button>
                    <button onClick={() => openComments(post)} className="text-muted-foreground">
                      <MessageCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold text-foreground">{post.likes_count} likes</p>
                {post.caption && (
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{post.farmer?.name ?? "Unknown"} </span>
                    {post.caption}
                  </p>
                )}

                {/* Tagged Product */}
                {post.tagged_product && <ProductTag product={post.tagged_product} />}

                {post.comments_count > 0 && (
                  <button onClick={() => openComments(post)} className="text-xs text-muted-foreground">
                    View all {post.comments_count} comments
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments Dialog */}
      <Dialog open={showComments && !!selectedPost} onOpenChange={(open) => { if (!open) { setShowComments(false); setSelectedPost(null); setComments([]); } }}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Comments</DialogTitle></DialogHeader>
          {selectedPost && (
            <>
              {selectedPost.caption && (
                <p className="text-sm text-foreground mb-2">
                  <span className="font-semibold">{selectedPost.farmer?.name ?? "Unknown"} </span>
                  {selectedPost.caption}
                </p>
              )}
              {selectedPost.tagged_product && (
                <div className="mb-2">
                  <ProductTag product={selectedPost.tagged_product} />
                </div>
              )}
              <div className="flex-1 overflow-y-auto space-y-3 max-h-60">
                {commentsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No comments yet</p>
                ) : comments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-muted-foreground">{c.user?.name?.[0] || "?"}</span>
                    </div>
                    <div>
                      <p className="text-sm"><span className="font-semibold text-foreground">{c.user?.name ?? "Unknown"} </span>{c.text}</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-border pt-3 mt-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment()}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button onClick={addComment} className="text-primary font-semibold text-sm">Post</button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(open) => { if (!open) closeUploadDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Post</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {uploadPreview && (
              <div className="aspect-square rounded-md overflow-hidden bg-muted">
                <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <textarea
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-secondary rounded-lg p-3 text-sm outline-none resize-none h-20 placeholder:text-muted-foreground"
            />
            {/* Product tagging */}
            {farmerProducts.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tag a product (optional)</label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a product to tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No product</SelectItem>
                    {farmerProducts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} — ${p.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleUploadPost} disabled={uploading} className="w-full rounded-full">
              {uploading ? "Posting..." : "Share Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </MobileLayout>
  );
};

export default Instafarm;
