import { useState } from "react";
import { Plus, Heart, MessageCircle, Grid, Image as ImageIcon, Edit2 } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";

const mockPosts = [
  { id: 1, image: "", caption: "Fresh harvest from the farm 🌿", likes: 24, comments: 5 },
  { id: 2, image: "", caption: "Our free-range chickens", likes: 18, comments: 3 },
  { id: 3, image: "", caption: "Beautiful morning at the farm", likes: 31, comments: 8 },
  { id: 4, image: "", caption: "Organic vegetables ready", likes: 42, comments: 12 },
  { id: 5, image: "", caption: "Farm life 🐄", likes: 15, comments: 2 },
  { id: 6, image: "", caption: "Sunset over the fields", likes: 56, comments: 9 },
];

const Instafarm = () => {
  const [view, setView] = useState<"grid" | "feed">("grid");
  const [selectedPost, setSelectedPost] = useState<number | null>(null);

  return (
    <MobileLayout>
      <PageHeader title="My Instafarm" rightAction={
        <button className="text-primary">
          <Plus className="w-5 h-5" />
        </button>
      } />

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
            {mockPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post.id)}
                className="aspect-square bg-muted rounded-sm flex items-center justify-center"
              >
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {mockPosts.map((post) => (
              <div key={post.id} className="space-y-2">
                <div className="aspect-square bg-muted rounded-xl flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                </div>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1 text-muted-foreground">
                    <Heart className="w-5 h-5" />
                    <span className="text-xs">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs">{post.comments}</span>
                  </button>
                  <button className="ml-auto text-muted-foreground">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-foreground">{post.caption}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Instafarm;
