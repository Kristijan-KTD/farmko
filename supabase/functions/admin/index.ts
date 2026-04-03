import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { action, ...params } = await req.json();

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized: admin access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    let result: any = null;

    switch (action) {
      case "get_dashboard_stats": {
        const { count: totalFarmers } = await supabaseClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "farmer");

        const { count: totalCustomers } = await supabaseClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "customer");

        const { count: totalProducts } = await supabaseClient
          .from("products")
          .select("*", { count: "exact", head: true });

        const { count: activeChats } = await supabaseClient
          .from("conversations")
          .select("*", { count: "exact", head: true });

        const { data: subs } = await supabaseClient
          .from("farmer_subscriptions")
          .select("plan");

        const planCounts = { starter: 0, growth: 0, pro: 0 };
        subs?.forEach((s: any) => {
          if (s.plan in planCounts) planCounts[s.plan as keyof typeof planCounts]++;
        });

        // New users last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: newUsersLast7Days } = await supabaseClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo);

        const { count: productsCreatedLast7Days } = await supabaseClient
          .from("products")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo);

        // Most active farmers (by product count)
        const { data: allProducts } = await supabaseClient
          .from("products")
          .select("farmer_id");

        const farmerProductCounts: Record<string, number> = {};
        allProducts?.forEach((p: any) => {
          farmerProductCounts[p.farmer_id] = (farmerProductCounts[p.farmer_id] || 0) + 1;
        });

        const topFarmerIds = Object.entries(farmerProductCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => ({ id, productCount: count }));

        let mostActiveFarmers: any[] = [];
        if (topFarmerIds.length > 0) {
          const { data: farmerProfiles } = await supabaseClient
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", topFarmerIds.map(f => f.id));

          mostActiveFarmers = topFarmerIds.map(f => {
            const profile = farmerProfiles?.find((p: any) => p.id === f.id);
            return { ...f, name: profile?.name || "Unknown", avatar_url: profile?.avatar_url };
          });
        }

        result = {
          totalFarmers, totalCustomers, totalProducts, activeChats,
          planCounts, newUsersLast7Days, productsCreatedLast7Days, mostActiveFarmers,
        };
        break;
      }

      case "get_subscriptions": {
        const { data } = await supabaseClient
          .from("farmer_subscriptions")
          .select("*, farmer:profiles!farmer_subscriptions_farmer_id_fkey(id, name, email, avatar_url)")
          .order("created_at", { ascending: false });

        result = data?.map((s: any) => ({
          ...s,
          farmer: Array.isArray(s.farmer) ? s.farmer[0] : s.farmer,
        }));
        break;
      }

      case "update_subscription": {
        const { farmerId, plan, status } = params;
        const { error } = await supabaseClient
          .from("farmer_subscriptions")
          .update({ plan, status })
          .eq("farmer_id", farmerId);

        if (error) throw error;
        result = { success: true };
        break;
      }

      case "get_farmers": {
        const { data } = await supabaseClient
          .from("profiles")
          .select("id, name, email, avatar_url, location, created_at, verified")
          .eq("role", "farmer")
          .order("created_at", { ascending: false });

        const farmerIds = data?.map((f: any) => f.id) || [];
        const { data: subs } = await supabaseClient
          .from("farmer_subscriptions")
          .select("farmer_id, plan, status")
          .in("farmer_id", farmerIds);

        const subMap = new Map(subs?.map((s: any) => [s.farmer_id, s]) || []);

        const { data: products } = await supabaseClient
          .from("products")
          .select("farmer_id")
          .eq("status", "active")
          .in("farmer_id", farmerIds);

        const productCounts = new Map<string, number>();
        products?.forEach((p: any) => {
          productCounts.set(p.farmer_id, (productCounts.get(p.farmer_id) || 0) + 1);
        });

        result = data?.map((f: any) => ({
          ...f,
          subscription: subMap.get(f.id) || { plan: "starter", status: "active" },
          productCount: productCounts.get(f.id) || 0,
        }));
        break;
      }

      case "promote_farmer": {
        const { farmerId, plan } = params;
        const { error } = await supabaseClient
          .from("farmer_subscriptions")
          .upsert({ farmer_id: farmerId, plan, status: "active" }, { onConflict: "farmer_id" });

        if (error) throw error;
        result = { success: true };
        break;
      }

      case "verify_farmer": {
        const { farmerId, verified } = params;
        const { error } = await supabaseClient
          .from("profiles")
          .update({ verified: !!verified })
          .eq("id", farmerId);

        if (error) throw error;
        result = { success: true };
        break;
      }

      // ===== NEW: Users Management =====
      case "get_users": {
        const { data } = await supabaseClient
          .from("profiles")
          .select("id, name, email, role, avatar_url, created_at, verified, is_test_account, created_by_admin")
          .order("created_at", { ascending: false });

        // Get subscriptions for farmers
        const farmerIds = data?.filter((u: any) => u.role === "farmer").map((u: any) => u.id) || [];
        let subMap = new Map<string, any>();
        if (farmerIds.length > 0) {
          const { data: subs } = await supabaseClient
            .from("farmer_subscriptions")
            .select("farmer_id, plan, status")
            .in("farmer_id", farmerIds);
          subMap = new Map(subs?.map((s: any) => [s.farmer_id, s]) || []);
        }

        // Get admin roles
        const { data: adminRoles } = await supabaseClient
          .from("user_roles")
          .select("user_id, role");
        const adminMap = new Map(adminRoles?.map((r: any) => [r.user_id, r.role]) || []);

        result = data?.map((u: any) => ({
          ...u,
          plan: u.role === "farmer" ? (subMap.get(u.id)?.plan ?? "starter") : null,
          isAdmin: adminMap.has(u.id),
          adminRole: adminMap.get(u.id) || null,
        }));
        break;
      }

      case "change_user_role": {
        const { userId, newRole } = params;
        if (!["farmer", "customer"].includes(newRole)) throw new Error("Invalid role");

        const { error } = await supabaseClient
          .from("profiles")
          .update({ role: newRole })
          .eq("id", userId);

        if (error) throw error;

        // If changing to farmer, ensure subscription exists
        if (newRole === "farmer") {
          await supabaseClient
            .from("farmer_subscriptions")
            .upsert({ farmer_id: userId, plan: "starter", status: "active" }, { onConflict: "farmer_id" });
        }

        result = { success: true };
        break;
      }

      case "toggle_admin": {
        const { userId, makeAdmin } = params;
        if (makeAdmin) {
          const { error } = await supabaseClient
            .from("user_roles")
            .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
          if (error) throw error;
        } else {
          const { error } = await supabaseClient
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", "admin");
          if (error) throw error;
        }
        result = { success: true };
        break;
      }

      case "ban_user": {
        const { userId, ban } = params;
        // Use Supabase admin API to ban/unban
        if (ban) {
          const { error } = await supabaseClient.auth.admin.updateUserById(userId, { ban_duration: "876000h" }); // ~100 years
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.auth.admin.updateUserById(userId, { ban_duration: "none" });
          if (error) throw error;
        }
        result = { success: true };
        break;
      }

      // ===== NEW: Products Management =====
      case "get_all_products": {
        const { data } = await supabaseClient
          .from("products")
          .select("id, title, status, category, price, unit, images, created_at, farmer_id")
          .order("created_at", { ascending: false });

        const farmerIds = [...new Set(data?.map((p: any) => p.farmer_id) || [])];
        let farmerMap = new Map<string, any>();
        if (farmerIds.length > 0) {
          const { data: farmers } = await supabaseClient
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", farmerIds);
          farmerMap = new Map(farmers?.map((f: any) => [f.id, f]) || []);
        }

        result = data?.map((p: any) => ({
          ...p,
          farmer: farmerMap.get(p.farmer_id) || { name: "Unknown" },
        }));
        break;
      }

      case "remove_product": {
        const { productId } = params;
        const { error } = await supabaseClient
          .from("products")
          .delete()
          .eq("id", productId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "update_product_status": {
        const { productId, status } = params;
        const { error } = await supabaseClient
          .from("products")
          .update({ status })
          .eq("id", productId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // ===== NEW: Content Moderation (Instafarm) =====
      case "get_all_instafarm_posts": {
        const { data } = await supabaseClient
          .from("instafarm_posts")
          .select("id, image_url, caption, created_at, farmer_id, product_id")
          .order("created_at", { ascending: false });

        const farmerIds = [...new Set(data?.map((p: any) => p.farmer_id) || [])];
        let farmerMap = new Map<string, any>();
        if (farmerIds.length > 0) {
          const { data: farmers } = await supabaseClient
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", farmerIds);
          farmerMap = new Map(farmers?.map((f: any) => [f.id, f]) || []);
        }

        const productIds = data?.filter((p: any) => p.product_id).map((p: any) => p.product_id) || [];
        let productMap = new Map<string, any>();
        if (productIds.length > 0) {
          const { data: products } = await supabaseClient
            .from("products")
            .select("id, title")
            .in("id", productIds);
          productMap = new Map(products?.map((p: any) => [p.id, p]) || []);
        }

        result = data?.map((p: any) => ({
          ...p,
          farmer: farmerMap.get(p.farmer_id) || { name: "Unknown" },
          product: p.product_id ? (productMap.get(p.product_id) || null) : null,
        }));
        break;
      }

      case "delete_instafarm_post": {
        const { postId } = params;
        await supabaseClient.from("post_likes").delete().eq("post_id", postId);
        await supabaseClient.from("post_comments").delete().eq("post_id", postId);
        const { error } = await supabaseClient.from("instafarm_posts").delete().eq("id", postId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // ===== Test User Management =====
      case "create_test_user": {
        const { email, password, fullName, role, plan, location, isTestAccount, avatarUrl } = params;
        if (!email || !password || !fullName || !role) {
          throw new Error("Missing required fields: email, password, fullName, role");
        }
        if (!["farmer", "customer"].includes(role)) throw new Error("Invalid role");

        // Create auth user using admin API (won't affect current session)
        const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: fullName, role },
        });
        if (createError) {
          if (createError.message?.includes("already been registered") || createError.message?.includes("unique")) {
            throw new Error("A user with this email already exists");
          }
          throw createError;
        }

        // Update the profile that was auto-created by the trigger
        const { error: profileError } = await supabaseClient
          .from("profiles")
          .update({
            name: fullName,
            role,
            location: location || null,
            avatar_url: avatarUrl || null,
            is_test_account: isTestAccount !== false,
            created_by_admin: true,
          })
          .eq("id", newUser.user.id);

        if (profileError) throw profileError;

        // If farmer, set up subscription
        if (role === "farmer" && plan && plan !== "starter") {
          await supabaseClient
            .from("farmer_subscriptions")
            .upsert({ farmer_id: newUser.user.id, plan, status: "active" }, { onConflict: "farmer_id" });
        }

        result = { success: true, userId: newUser.user.id };
        break;
      }

      case "delete_test_user": {
        const { userId } = params;
        // Verify it's a test account
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("is_test_account")
          .eq("id", userId)
          .single();

        if (!profile?.is_test_account) {
          throw new Error("Can only delete test accounts");
        }

        // Delete auth user (cascades to profile via FK)
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;

        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
