import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

        const { data: subs } = await supabaseClient
          .from("farmer_subscriptions")
          .select("plan");

        const planCounts = { starter: 0, growth: 0, pro: 0 };
        subs?.forEach((s: any) => {
          if (s.plan in planCounts) planCounts[s.plan as keyof typeof planCounts]++;
        });

        result = { totalFarmers, totalCustomers, totalProducts, planCounts };
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
