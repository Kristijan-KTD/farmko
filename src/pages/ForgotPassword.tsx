import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleReset = () => {
    if (email) setSent(true);
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
        <div className="flex items-center gap-3 border-b border-input pb-3">
          <Mail className="w-5 h-5 text-muted-foreground" />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="pb-8">
        <Button onClick={handleReset} className="w-full rounded-full h-12 text-base font-semibold">
          Continue
        </Button>
      </div>
    </MobileLayout>
  );
};

export default ForgotPassword;
