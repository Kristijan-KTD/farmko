import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a recovery session from the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    if (type !== "recovery") {
      // Also check query params (some flows use query params)
      const searchParams = new URLSearchParams(window.location.search);
      const searchType = searchParams.get("type");
      if (searchType !== "recovery") {
        // If no recovery token, redirect to login
        // But give Supabase a moment to process the token
        const timer = setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
              navigate("/login");
            }
          });
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [navigate]);

  const handleReset = async () => {
    setError("");

    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  };

  if (success) {
    return (
      <MobileLayout>
        <PageHeader title="Password Reset" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Password updated!</h2>
          <p className="text-sm text-muted-foreground text-center px-8">
            Your password has been successfully reset.
          </p>
        </div>
        <div className="pb-8">
          <Button onClick={() => navigate("/home")} className="w-full rounded-full h-12 text-base font-semibold">
            Continue to Home
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="Set New Password" />
      <div className="flex-1 flex flex-col pt-8 max-w-md mx-auto w-full">
        <p className="text-sm text-muted-foreground mb-8">
          Enter your new password below.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          <div className="flex items-center gap-3 border-b border-input pb-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>

          <div className="flex items-center gap-3 border-b border-input pb-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReset()}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </div>
      <div className="pb-8 max-w-md mx-auto w-full">
        <Button onClick={handleReset} disabled={isLoading} className="w-full rounded-full h-12 text-base font-semibold">
          {isLoading ? "Updating..." : "Reset Password"}
        </Button>
      </div>
    </MobileLayout>
  );
};

export default ResetPassword;
