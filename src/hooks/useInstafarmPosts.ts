import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/distance";
import type { InstafarmPostData } from "@/components/instafarm/InstafarmCard";

interface UseInstafarmPostsOptions {
  farmerId?: string;
  limit?: number;
  userLocation?: { lat: number; lng: number } | null;
  maxDistance?: number; // km, only used when userLocation is provided
}

export const useInstafarmPosts = ({
  farmerId,
  limit = 6,
  userLocation = null,
  maxDistance = 100,
}: UseInstafarmPostsOptions = {}) => {
  const [posts, setPosts] = useState<InstafarmPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchPosts = async () => {
      try {
        let query = supabase
          .from("instafarm_posts")
          .select("id, image_url, caption, farmer_id, product_id, farmer:profiles!instafarm_posts_farmer_id_fkey(name, avatar_url, latitude, longitude)")
          .order("created_at", { ascending: false })
          .limit(userLocation ? limit * 5 : limit); // fetch more when filtering by distance

        if (farmerId) {
          query = query.eq("farmer_id", farmerId);
        }

        const { data: postsData } = await query;
        if (!mounted || !postsData) return;

        // Enrich with product data
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

        // Map to enriched posts with distance
        let enriched: InstafarmPostData[] = postsData.map(p => {
          const farmer = Array.isArray(p.farmer) ? p.farmer[0] : p.farmer;
          let distance: number | undefined = undefined;

          if (userLocation && farmer?.latitude && farmer?.longitude) {
            distance = haversineKm(userLocation.lat, userLocation.lng, farmer.latitude, farmer.longitude);
          }

          return {
            id: p.id,
            image_url: p.image_url,
            caption: p.caption,
            farmer_id: p.farmer_id,
            farmer_name: farmer?.name ?? "Farmer",
            farmer_avatar: farmer?.avatar_url ?? null,
            tagged_product: p.product_id ? productMap.get(p.product_id) || null : null,
            distance,
          };
        });

        // Filter and sort by distance when location is available
        if (userLocation && !farmerId) {
          const nearby = enriched
            .filter(p => p.distance != null && p.distance <= maxDistance)
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

          if (nearby.length >= 2) {
            enriched = nearby.slice(0, limit);
            setIsFallback(false);
          } else {
            // Expand: try 200km
            const expanded = enriched
              .filter(p => p.distance != null && p.distance <= maxDistance * 2)
              .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

            if (expanded.length >= 2) {
              enriched = expanded.slice(0, limit);
              setIsFallback(true);
            } else {
              // Fallback to recent posts
              enriched = enriched.slice(0, limit);
              setIsFallback(true);
            }
          }
        } else {
          enriched = enriched.slice(0, limit);
        }

        setPosts(enriched);
      } catch {
        // non-critical
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPosts();
    return () => { mounted = false; };
  }, [farmerId, limit, userLocation?.lat, userLocation?.lng, maxDistance]);

  return { posts, loading, isFallback };
};
