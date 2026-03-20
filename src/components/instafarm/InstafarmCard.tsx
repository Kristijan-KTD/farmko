import { Package, ExternalLink, User, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistance } from "@/lib/distance";

interface TaggedProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
}

export interface InstafarmPostData {
  id: string;
  image_url: string;
  caption: string | null;
  farmer_id: string;
  farmer_name?: string;
  farmer_avatar?: string | null;
  tagged_product?: TaggedProduct | null;
  distance?: number;
}

interface InstafarmCardProps {
  post: InstafarmPostData;
  variant?: "compact" | "standard";
}

const InstafarmCard = ({ post, variant = "standard" }: InstafarmCardProps) => {
  const navigate = useNavigate();

  const handleCTA = () => {
    if (post.tagged_product) {
      navigate(`/product/${post.tagged_product.id}`);
    } else {
      navigate(`/farmer/${post.farmer_id}`);
    }
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleCTA}
        className="card-interactive flex flex-col shrink-0 w-[200px] min-w-[200px] snap-start overflow-hidden text-left"
      >
        <div className="aspect-[4/3] bg-muted relative overflow-hidden rounded-t-lg">
          <img src={post.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          {post.tagged_product && (
            <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Package className="w-2.5 h-2.5" />
              ${post.tagged_product.price.toFixed(2)}
            </div>
          )}
        </div>
        <div className="p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {post.farmer_avatar ? (
                <img src={post.farmer_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] font-bold text-muted-foreground">{post.farmer_name?.[0] || "?"}</span>
              )}
            </div>
            <span className="text-[11px] font-medium text-foreground truncate flex-1">{post.farmer_name || "Farmer"}</span>
            {post.distance != null && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                <MapPin className="w-2.5 h-2.5" />
                {formatDistance(post.distance)}
              </span>
            )}
          </div>
          {post.caption && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{post.caption}</p>
          )}
          <span className="text-[10px] font-semibold text-primary">
            {post.tagged_product ? "View Product →" : "View Farmer →"}
          </span>
        </div>
      </button>
    );
  }

  // Standard variant
  return (
    <div className="card-interactive overflow-hidden text-left">
      <div className="aspect-[4/3] bg-muted relative overflow-hidden rounded-t-lg">
        <img src={post.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="p-3 space-y-2">
        {post.distance != null && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <MapPin className="w-3 h-3" />
            {formatDistance(post.distance)}
          </span>
        )}
        {post.caption && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{post.caption}</p>
        )}
        {post.tagged_product && (
          <button
            onClick={() => navigate(`/product/${post.tagged_product!.id}`)}
            className="w-full flex items-center gap-2.5 p-2 rounded-md bg-secondary/80 border border-border"
          >
            <div className="w-8 h-8 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
              {post.tagged_product.images?.[0] ? (
                <img src={post.tagged_product.images[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-3.5 h-3.5 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[11px] font-medium text-foreground truncate">{post.tagged_product.title}</p>
              <p className="text-[11px] font-bold text-primary">${post.tagged_product.price.toFixed(2)}</p>
            </div>
            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
          </button>
        )}
        <button
          onClick={handleCTA}
          className="text-[11px] font-semibold text-primary"
        >
          {post.tagged_product ? "View Product →" : "View Farmer →"}
        </button>
      </div>
    </div>
  );
};

export default InstafarmCard;
