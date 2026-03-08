import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    const { error } = await login(email, password);

    if (error) {
      if (error.toLowerCase().includes("invalid login")) {
        setErrors({ general: "Invalid email or password" });
      } else if (error.toLowerCase().includes("email not confirmed")) {
        setErrors({ general: "Please verify your email address before signing in" });
      } else {
        setErrors({ general: error });
      }
      setIsLoading(false);
      return;
    }

    toast({ title: "Welcome back!" });
    navigate("/home");
    setIsLoading(false);
  };

  return (
    <MobileLayout hideDesktopSidebar>
      <div className="flex-1 flex flex-col pt-12 max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
        <p className="text-muted-foreground text-sm mb-10">Log in to your account</p>

        {errors.general && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{errors.general}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <div className={`flex items-center gap-3 border-b pb-3 ${errors.email ? "border-destructive" : "border-input"}`}>
              <Mail className={`w-5 h-5 ${errors.email ? "text-destructive" : "text-muted-foreground"}`} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined, general: undefined })); }}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {errors.email && <p className="text-xs text-destructive mt-1.5 ml-8">{errors.email}</p>}
          </div>

          <div>
            <div className={`flex items-center gap-3 border-b pb-3 ${errors.password ? "border-destructive" : "border-input"}`}>
              <Lock className={`w-5 h-5 ${errors.password ? "text-destructive" : "text-muted-foreground"}`} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined, general: undefined })); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1.5 ml-8">{errors.password}</p>}
          </div>
        </div>

        <button
          onClick={() => navigate("/forgot-password")}
          className="text-primary text-sm mt-4 self-end"
        >
          Forgot Password?
        </button>
      </div>

      <div className="pb-8 space-y-4 max-w-md mx-auto w-full">
        <Button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full rounded-full h-12 text-base font-semibold"
        >
          {isLoading ? "Logging in..." : "Continue"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <button onClick={() => navigate("/register")} className="text-primary font-medium">
            Sign up
          </button>
        </p>
      </div>
    </MobileLayout>
  );
};

export default Login;
