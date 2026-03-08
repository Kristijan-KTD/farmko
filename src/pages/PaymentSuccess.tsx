import { useEffect } from "react";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    // Mark order as paid
    if (orderId) {
      supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", orderId)
        .then(() => {});
    }
  }, [orderId]);

  return (
    <MobileLayout hideNav>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Payment Successful!</h1>
          <p className="text-muted-foreground text-sm">
            Your order has been placed. The farmer will be notified and you can track your order status.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={() => navigate("/explore")} className="rounded-full h-12 gap-2">
            <ShoppingBag className="w-5 h-5" />
            Continue Shopping
          </Button>
          <Button variant="outline" onClick={() => navigate("/home")} className="rounded-full h-12">
            Go Home
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default PaymentSuccess;
