import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { InstafarmPostData } from "@/components/instafarm/InstafarmCard";

interface UseInstafarmPostsOptions {
  farmerId?: string;
  limit?: number;
}

export const useInstafarmPosts = ({ farmerId, limit = 6 }: UseInstafarmPostsOptions = {}) => {
  const [posts, setPosts] = useState<InstafarmPostData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      try {
        let query = supabase
          .from("instafarm_posts")
          .select("id, image_url, caption, farmer_id, product_id, farmer:profiles!instafarm_posts_farmer_id_fkey(name, avatar_url)")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (farmerId) {
          query = query.eq("farmer_id", farmerId);
        }

        const { data: postsData } = await query;
        if (!mounted || !postsData) return;

        const productIds = postsData.map(p => p.product_id).filter(Boolean) as string[];
        let productMap = new Map<string, any>();

        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, title, price, images")
            .in("id", productIds);
          (products ?? []).forEach(p => productMap.set(p.id, p));
        }

        if (!mounted) return;

        setPosts(postsData.map(p => {
          const farmer = Array.isArray(p.farmer) ? p.farmer[0] : p.farmer;
          return {
            id: p.id,
            image_url: p.image_url,
            caption: p.caption,
            farmer_id: p.farmer_id,
            farmer_name: farmer?.name ?? "Farmer",
            farmer_avatar: farmer?.avatar_url ?? null,
            tagged_product: p.product_id ? productMap.get(p.product_id) || null : null,
          };
        }));
      } catch {
        // non-critical
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetch();
    return () => { mounted = false; };
  }, [farmerId, limit]);

  return { posts, loading };
};
