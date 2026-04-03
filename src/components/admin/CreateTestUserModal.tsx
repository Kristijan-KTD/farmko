import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, UserPlus } from "lucide-react";
import { adminService } from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import type { Plan } from "@/types/admin";

interface CreateTestUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  presetRole?: "farmer" | "customer";
}

const generateEmail = (role: "farmer" | "customer") => {
  const num = String(Math.floor(Math.random() * 999) + 1).padStart(2, "0");
  return role === "farmer" ? `testfarmer${num}@farmko.app` : `testcustomer${num}@farmko.app`;
};

const CreateTestUserModal = ({ open, onOpenChange, onCreated, presetRole }: CreateTestUserModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"farmer" | "customer">(presetRole || "farmer");
  const [plan, setPlan] = useState<Plan>("starter");
  const [location, setLocation] = useState("");
  const [isTestAccount, setIsTestAccount] = useState(true);

  useEffect(() => {
    if (open) {
      const r = presetRole || "farmer";
      setRole(r);
      setEmail(generateEmail(r));
      setFullName(r === "farmer" ? "Test Farmer" : "Test Customer");
      setPassword("TestPass123!");
      setPlan("starter");
      setLocation("");
      setIsTestAccount(true);
    }
  }, [open, presetRole]);

  const handleRoleChange = (newRole: "farmer" | "customer") => {
    setRole(newRole);
    setEmail(generateEmail(newRole));
    setFullName(newRole === "farmer" ? "Test Farmer" : "Test Customer");
    if (newRole === "customer") setPlan("starter");
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await adminService.createTestUser({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
        plan: role === "farmer" ? plan : undefined,
        location: location.trim() || undefined,
        isTestAccount,
      });
      toast({ title: `Test ${role === "farmer" ? "Farmer" : "Customer"} created successfully` });
      onOpenChange(false);
      onCreated();
    } catch (e: unknown) {
      toast({
        title: "Error creating test user",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create Test User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Account Type</Label>
            <Select value={role} onValueChange={(v) => handleRoleChange(v as "farmer" | "customer")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="farmer">Farmer</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Test Farmer" maxLength={30} />
          </div>

          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="testfarmer01@farmko.app" />
          </div>

          <div className="space-y-1.5">
            <Label>Password *</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="TestPass123!" />
          </div>

          {role === "farmer" && (
            <div className="space-y-1.5">
              <Label>Membership Plan</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Location (optional)</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City name" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label className="cursor-pointer">Mark as test account</Label>
            <Switch checked={isTestAccount} onCheckedChange={setIsTestAccount} />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Create Test {role === "farmer" ? "Farmer" : "Customer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTestUserModal;
