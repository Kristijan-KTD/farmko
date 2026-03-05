import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = () => {
    if (email && password) {
      login(email, password);
      navigate("/home");
    }
  };

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col pt-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
        <p className="text-muted-foreground text-sm mb-10">Log in to your account</p>

        <div className="space-y-6">
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
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        <button
          onClick={() => navigate("/forgot-password")}
          className="text-primary text-sm mt-4 self-end"
        >
          Forgot Password?
        </button>
      </div>

      <div className="pb-8 space-y-4">
        <Button onClick={handleLogin} className="w-full rounded-full h-12 text-base font-semibold">
          Continue
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
