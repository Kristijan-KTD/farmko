import { useState } from "react";
import { Plus, Heart, MessageCircle, Grid, Image as ImageIcon, Send, Share2, Bookmark, X, MoreHorizontal } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Comment {
  id: number;
  user: string;
  text: string;
  time: string;
}

interface Post {
  id: number;
  image: string;
  caption: string;
  likes: number;
  comments: Comment[];
  liked: boolean;
  saved: boolean;
  time: string;
  author: string;
}

const initialPosts: Post[] = [
  { id: 1, image: "", caption: "Fresh harvest from the farm 🌿", likes: 24, comments: [
    { id: 1, user: "Alice", text: "Looks amazing! 😍", time: "2h ago" },
    { id: 2, user: "Bob", text: "Can I order some?", time: "1h ago" },
  ], liked: false, saved: false, time: "3h ago", author: "My Farm" },
  { id: 2, image: "", caption: "Our free-range chickens roaming freely 🐔", likes: 18, comments: [
    { id: 1, user: "Sarah", text: "Love this!", time: "5h ago" },
  ], liked: false, saved: false, time: "6h ago", author: "My Farm" },
  { id: 3, image: "", caption: "Beautiful morning at the farm ☀️", likes: 31, comments: [
    { id: 1, user: "Mike", text: "Gorgeous view!", time: "8h ago" },
    { id: 2, user: "Jane", text: "Wish I was there", time: "7h ago" },
    { id: 3, user: "Tom", text: "Farm life 💚", time: "6h ago" },
  ], liked: true, saved: false, time: "10h ago", author: "My Farm" },
  { id: 4, image: "", caption: "Organic vegetables ready for the market 🥬", likes: 42, comments: [], liked: false, saved: true, time: "1d ago", author: "My Farm" },
  { id: 5, image: "", caption: "Farm life with the cows 🐄", likes: 15, comments: [], liked: false, saved: false, time: "2d ago", author: "My Farm" },
  { id: 6, image: "", caption: "Sunset over the golden fields 🌾", likes: 56, comments: [
    { id: 1, user: "Emma", text: "Stunning!", time: "2d ago" },
  ], liked: false, saved: false, time: "3d ago", author: "My Farm" },
];

const Instafarm = () => {
  const [view, setView] = useState<"grid" | "feed">("grid");
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const { toast } = useToast();

  const toggleLike = (postId: number) => {
    setPosts(posts.map(p =>
      p.id === postId
        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

  const toggleSave = (postId: number) => {
    setPosts(posts.map(p =>
      p.id === postId ? { ...p, saved: !p.saved } : p
    ));
    const post = posts.find(p => p.id === postId);
    toast({ title: post?.saved ? "Removed from saved" : "Post saved" });
  };

  const handleShare = (postId: number) => {
    toast({ title: "Link copied!", description: "Share link copied to clipboard" });
  };

  const addComment = (postId: number) => {
    if (!commentText.trim()) return;
    setPosts(posts.map(p =>
      p.id === postId
        ? {
            ...p,
            comments: [...p.comments, { id: Date.now(), user: "You", text: commentText, time: "Just now" }],
          }
        : p
    ));
    setCommentText("");
  };

  const openPostDetail = (post: Post) => {
    setSelectedPost(post);
    setShowComments(true);
  };

  // Keep selectedPost in sync with posts state
  const currentPost = selectedPost ? posts.find(p => p.id === selectedPost.id) || selectedPost : null;

  return (
    <MobileLayout>
      <PageHeader title="My Instafarm" rightAction={
        <button className="text-primary" onClick={() => toast({ title: "Coming soon", description: "Photo upload will be available with Cloud" })}>
          <Plus className="w-5 h-5" />
        </button>
      } />

      {/* Stats bar */}
      <div className="flex items-center justify-around py-3 mb-2 border-b border-border">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{posts.length}</p>
          <p className="text-[10px] text-muted-foreground">Posts</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{posts.reduce((a, p) => a + p.likes, 0)}</p>
          <p className="text-[10px] text-muted-foreground">Likes</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{posts.reduce((a, p) => a + p.comments.length, 0)}</p>
          <p className="text-[10px] text-muted-foreground">Comments</p>
        </div>
      </div>

      <div className="flex gap-4 mb-4 border-b border-border">
        <button
          onClick={() => setView("grid")}
          className={`pb-3 px-2 text-sm font-medium transition-colors ${
            view === "grid" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          <Grid className="w-5 h-5" />
        </button>
        <button
          onClick={() => setView("feed")}
          className={`pb-3 px-2 text-sm font-medium transition-colors ${
            view === "feed" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          <ImageIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 pb-20">
        {view === "grid" ? (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => openPostDetail(post)}
                className="aspect-square bg-muted rounded-sm flex items-center justify-center relative group"
              >
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-sm">
                  <span className="flex items-center gap-1 text-white text-xs font-medium">
                    <Heart className="w-4 h-4 fill-white" /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1 text-white text-xs font-medium">
                    <MessageCircle className="w-4 h-4 fill-white" /> {post.comments.length}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="space-y-2">
                {/* Post header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">M</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{post.author}</p>
                      <p className="text-[10px] text-muted-foreground">{post.time}</p>
                    </div>
                  </div>
                  <button className="text-muted-foreground">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <div className="aspect-square bg-muted rounded-xl flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1 transition-colors ${post.liked ? "text-red-500" : "text-muted-foreground"}`}
                    >
                      <Heart className={`w-6 h-6 ${post.liked ? "fill-red-500" : ""}`} />
                    </button>
                    <button
                      onClick={() => openPostDetail(post)}
                      className="flex items-center gap-1 text-muted-foreground"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </button>
                    <button onClick={() => handleShare(post.id)} className="text-muted-foreground">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                  <button onClick={() => toggleSave(post.id)} className={post.saved ? "text-foreground" : "text-muted-foreground"}>
                    <Bookmark className={`w-5 h-5 ${post.saved ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* Likes count */}
                <p className="text-sm font-semibold text-foreground">{post.likes} likes</p>

                {/* Caption */}
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{post.author} </span>
                  {post.caption}
                </p>

                {/* Comments preview */}
                {post.comments.length > 0 && (
                  <button
                    onClick={() => openPostDetail(post)}
                    className="text-xs text-muted-foreground"
                  >
                    View all {post.comments.length} comments
                  </button>
                )}

                {/* Inline comment input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground py-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value;
                        if (val.trim()) {
                          setPosts(posts.map(p =>
                            p.id === post.id
                              ? { ...p, comments: [...p.comments, { id: Date.now(), user: "You", text: val, time: "Just now" }] }
                              : p
                          ));
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments Dialog */}
      <Dialog open={showComments && !!currentPost} onOpenChange={(open) => { if (!open) { setShowComments(false); setSelectedPost(null); } }}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          {currentPost && (
            <>
              <p className="text-sm text-foreground mb-2">
                <span className="font-semibold">{currentPost.author} </span>
                {currentPost.caption}
              </p>
              <div className="flex-1 overflow-y-auto space-y-3 max-h-60">
                {currentPost.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Be the first!</p>
                ) : (
                  currentPost.comments.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground">{c.user[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-semibold text-foreground">{c.user} </span>
                          <span className="text-foreground">{c.text}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{c.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2 border-t border-border pt-3 mt-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment(currentPost.id)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button onClick={() => addComment(currentPost.id)} className="text-primary font-semibold text-sm">
                  Post
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </MobileLayout>
  );
};

export default Instafarm;
