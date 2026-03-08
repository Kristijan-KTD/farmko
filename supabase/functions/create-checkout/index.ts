import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { productId, quantity = 1 } = await req.json();
    if (!productId) throw new Error("Product ID is required");

    // Fetch product details
    const { data: product, error: productError } = await supabaseClient
      .from("products")
      .select("id, title, description, price, unit, farmer_id, images")
      .eq("id", productId)
      .single();

    if (productError || !product) throw new Error("Product not found");

    const totalAmount = product.price * quantity;

    // Create order record
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        customer_id: user.id,
        product_id: product.id,
        farmer_id: product.farmer_id,
        quantity,
        total_amount: totalAmount,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError) throw new Error("Failed to create order: " + orderError.message);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const imageUrl = product.images?.[0] || undefined;

    // Create checkout session with dynamic price
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.title,
              description: product.description || undefined,
              images: imageUrl ? [imageUrl] : undefined,
            },
            unit_amount: Math.round(product.price * 100), // cents
          },
          quantity,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${req.headers.get("origin")}/product/${product.id}`,
      metadata: {
        order_id: order.id,
        product_id: product.id,
      },
    });

    // Update order with stripe session id
    await supabaseClient
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
