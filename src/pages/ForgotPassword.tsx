import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, AlertCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleReset = async () => {
    if (!email) return;
    setIsLoading(true);
    setError("");

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }

    setSent(true);
    setIsLoading(false);
  };

  if (sent) {
    return (
      <MobileLayout>
        <PageHeader title="Forgot Password" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Check your email</h2>
          <p className="text-sm text-muted-foreground text-center px-8">
            We've sent a password reset link to {email}
          </p>
        </div>
        <div className="pb-8">
          <Button onClick={() => navigate("/login")} className="w-full rounded-full h-12 text-base font-semibold">
            Back to Login
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="Forgot Password" />
      <div className="flex-1 flex flex-col pt-8">
        <p className="text-sm text-muted-foreground mb-8">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3 border-b border-input pb-3">
          <Mail className="w-5 h-5 text-muted-foreground" />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReset()}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="pb-8">
        <Button onClick={handleReset} disabled={isLoading} className="w-full rounded-full h-12 text-base font-semibold">
          {isLoading ? "Sending..." : "Continue"}
        </Button>
      </div>
    </MobileLayout>
  );
};

export default ForgotPassword;
