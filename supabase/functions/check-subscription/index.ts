import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const getLimitForPlan = (plan: string) => {
  if (plan === "pro") return null;
  if (plan === "growth") return 6;
  return 3;
};

// Map Stripe product IDs to plan names (both old and new)
const PRODUCT_PLAN_MAP: Record<string, string> = {
  // Legacy products
  "prod_U70kdowQgNhm1Q": "growth",
  "prod_U70kEspnycdHnj": "pro",
  "prod_UGGlYMMmgvNhPH": "growth",
  "prod_UGGmDQhtv8bzwh": "pro",
  // New products (updated pricing)
  "prod_UHrz1RSt4wYPMv": "growth",
  "prod_UHrz0fvvCu2twD": "growth",
  "prod_UHs0nhWKNv8QRW": "pro",
  "prod_UHs0kFNScwGIzd": "pro",
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
    logStep("Function started");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header", subscribed: false, plan: "starter" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      logStep("Auth failed, returning starter gracefully", { error: userError?.message });
      return new Response(JSON.stringify({ subscribed: false, plan: "starter" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const user = userData.user;
    const userId = user.id;
    const email = user.email!;
    logStep("User authenticated", { userId, email });

    const { data: existingSubscription } = await supabaseClient
      .from("farmer_subscriptions")
      .select("plan, status, renewal_date, stripe_subscription_id")
      .eq("farmer_id", userId)
      .maybeSingle();

    // Admin override: plan was set without a Stripe subscription ID
    // This covers both upgrades (e.g. admin sets "pro" without Stripe) AND
    // downgrades (e.g. admin sets "starter" after cancelling Stripe sub)
    const hasAdminOverride = Boolean(
      existingSubscription &&
      existingSubscription.status === "active" &&
      !existingSubscription.stripe_subscription_id
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      if (hasAdminOverride) {
        logStep("No Stripe customer found, preserving admin-set plan", { plan: existingSubscription?.plan });
        return new Response(JSON.stringify({
          subscribed: existingSubscription?.plan !== "starter",
          plan: existingSubscription?.plan,
          subscription_end: existingSubscription?.renewal_date || null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("No Stripe customer found, defaulting to starter");
      await supabaseClient
        .from("farmer_subscriptions")
        .upsert({
          farmer_id: userId,
          plan: "starter",
          status: "active",
          renewal_date: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          listings_limit_per_period: getLimitForPlan("starter"),
        }, { onConflict: "farmer_id" });

      return new Response(JSON.stringify({ subscribed: false, plan: "starter" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // If admin has overridden the plan, cancel any active Stripe subscriptions
    // that conflict, and preserve the admin-set plan
    if (hasAdminOverride) {
      const activeStripeSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });
      // Cancel any lingering Stripe subscriptions that admin intended to remove
      for (const sub of activeStripeSubs.data) {
        logStep("Cancelling orphaned Stripe subscription due to admin override", { subId: sub.id });
        try {
          await stripe.subscriptions.cancel(sub.id);
        } catch (e) {
          logStep("Failed to cancel orphaned subscription", { subId: sub.id, error: String(e) });
        }
      }
      logStep("Preserving admin-set plan", { plan: existingSubscription?.plan });
      return new Response(JSON.stringify({
        subscribed: existingSubscription?.plan !== "starter",
        plan: existingSubscription?.plan,
        subscription_end: existingSubscription?.renewal_date || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription");
      await supabaseClient
        .from("farmer_subscriptions")
        .upsert({
          farmer_id: userId,
          plan: "starter",
          status: "active",
          renewal_date: null,
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          listings_limit_per_period: getLimitForPlan("starter"),
        }, { onConflict: "farmer_id" });

      return new Response(JSON.stringify({ subscribed: false, plan: "starter" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const productId = subscription.items.data[0].price.product as string;
    const plan = PRODUCT_PLAN_MAP[productId] || "starter";
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    logStep("Active subscription found", { plan, productId, subscriptionEnd });

    const limitForPlan = getLimitForPlan(plan);

    await supabaseClient
      .from("farmer_subscriptions")
      .upsert({
        farmer_id: userId,
        plan,
        status: "active",
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        renewal_date: subscriptionEnd,
        listings_limit_per_period: limitForPlan,
      }, { onConflict: "farmer_id" });

    return new Response(JSON.stringify({
      subscribed: true,
      plan,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
