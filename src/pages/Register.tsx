import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, UserRole } from "@/contexts/AuthContext";

const Register = () => {
  const [role, setRole] = useState<UserRole>("farmer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleRegister = () => {
    if (name && email && password && password === confirmPassword && agreed) {
      register(name, email, password, role);
      navigate("/home");
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="Create new account" />

      <div className="flex-1 flex flex-col">
        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">Register as</p>
          <div className="flex gap-3">
            <button
              onClick={() => setRole("farmer")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                role === "farmer"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground border border-border"
              }`}
            >
              Farmer
            </button>
            <button
              onClick={() => setRole("customer")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                role === "customer"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground border border-border"
              }`}
            >
              Customer
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-3 border-b border-input pb-3">
            <User className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

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

          <div className="flex items-center gap-3 border-b border-input pb-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
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
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <p className="text-xs text-muted-foreground">
              I agree with Farmko's{" "}
              <span className="text-primary">Terms of Use</span> and{" "}
              <span className="text-primary">Privacy Policies</span>
            </p>
          </div>
        </div>
      </div>

      <div className="pb-8 space-y-4">
        <Button onClick={handleRegister} className="w-full rounded-full h-12 text-base font-semibold">
          Continue
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have account?{" "}
          <button onClick={() => navigate("/login")} className="text-primary font-medium">
            Log in
          </button>
        </p>
      </div>
    </MobileLayout>
  );
};

export default Register;
