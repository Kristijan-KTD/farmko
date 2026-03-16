import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Register = () => {
  const [role, setRole] = useState<UserRole>("farmer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();

  const handleRegister = async () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Full name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!validateEmail(email)) newErrors.email = "Please enter a valid email";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Must be at least 6 characters";
    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!agreed) newErrors.agreed = "You must agree to the terms";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    const { error } = await register(name, email, password, role);

    if (error) {
      if (error.toLowerCase().includes("already registered")) {
        setErrors({ email: "This email is already registered" });
      } else {
        setErrors({ general: error });
      }
      setIsLoading(false);
      return;
    }

    toast({
      title: "Check your email!",
      description: "We've sent you a verification link. Please verify your email to sign in.",
    });
    navigate("/login");
    setIsLoading(false);
  };

  const clearError = (field: string) => setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  return (
    <MobileLayout hideDesktopSidebar>
      <PageHeader title="Create new account" />

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">Register as</p>
          <div className="flex gap-3">
            {(["farmer", "customer"] as UserRole[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                  role === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground border border-border"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{errors.general}</p>
          </div>
        )}

        <div className="space-y-5">
          {[
            { icon: User, label: "Full Name", value: name, onChange: setName, field: "name", type: "text" },
            { icon: Mail, label: "Email Address", value: email, onChange: setEmail, field: "email", type: "email" },
          ].map(({ icon: Icon, label, value, onChange, field, type }) => (
            <div key={field}>
              <div className={`flex items-center gap-3 border-b pb-3 ${errors[field] ? "border-destructive" : "border-input"}`}>
                <Icon className={`w-5 h-5 ${errors[field] ? "text-destructive" : "text-muted-foreground"}`} />
                <input
                  type={type}
                  placeholder={label}
                  value={value}
                  onChange={(e) => { onChange(e.target.value); clearError(field); }}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              {errors[field] && <p className="text-xs text-destructive mt-1.5 ml-8">{errors[field]}</p>}
            </div>
          ))}

          <div>
            <div className={`flex items-center gap-3 border-b pb-3 ${errors.password ? "border-destructive" : "border-input"}`}>
              <Lock className={`w-5 h-5 ${errors.password ? "text-destructive" : "text-muted-foreground"}`} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1.5 ml-8">{errors.password}</p>}
          </div>

          <div>
            <div className={`flex items-center gap-3 border-b pb-3 ${errors.confirmPassword ? "border-destructive" : "border-input"}`}>
              <Lock className={`w-5 h-5 ${errors.confirmPassword ? "text-destructive" : "text-muted-foreground"}`} />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError("confirmPassword"); }}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1.5 ml-8">{errors.confirmPassword}</p>}
          </div>

          <div>
            <div className="flex items-start gap-2 pt-2">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => { setAgreed(v === true); clearError("agreed"); }}
                className="mt-0.5"
              />
              <p className="text-xs text-muted-foreground">
                I agree with Farmko's{" "}
                <span className="text-primary">Terms of Use</span> and{" "}
                <span className="text-primary">Privacy Policies</span>
              </p>
            </div>
            {errors.agreed && <p className="text-xs text-destructive mt-1 ml-6">{errors.agreed}</p>}
          </div>
        </div>
      </div>

      <div className="pb-8 space-y-4 max-w-md mx-auto w-full">
        <Button onClick={handleRegister} disabled={isLoading} className="w-full rounded-full h-12 text-base font-semibold">
          {isLoading ? "Creating account..." : "Continue"}
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
