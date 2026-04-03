import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, User, Search, RefreshCw, ChevronLeft, ChevronRight, Shield, ShieldOff, Ban, UserPlus, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import { adminService } from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateTestUserModal from "@/components/admin/CreateTestUserModal";
import type { AdminUser } from "@/types/admin";

const PAGE_SIZE = 20;

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "farmer" | "customer" | "admin" | "test">("all");
  const [page, setPage] = useState(1);

  // Test user modal
  const [modalOpen, setModalOpen] = useState(false);
  const [presetRole, setPresetRole] = useState<"farmer" | "customer" | undefined>();

  const fetchUsers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminService.getUsers();
      if (signal?.aborted) return;
      setUsers(data ?? []);
    } catch {
      if (signal?.aborted) return;
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(controller.signal);
    return () => controller.abort();
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (roleFilter === "admin") {
      list = list.filter(u => u.isAdmin);
    } else if (roleFilter === "test") {
      list = list.filter(u => u.is_test_account);
    } else if (roleFilter !== "all") {
      list = list.filter(u => u.role === roleFilter);
    }
    return list;
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: "farmer" | "customer") => {
    try {
      await adminService.changeUserRole(userId, newRole);
      toast({ title: "Role updated" });
      await fetchUsers();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleToggleAdmin = async (userId: string, makeAdmin: boolean) => {
    try {
      await adminService.toggleAdmin(userId, makeAdmin);
      toast({ title: makeAdmin ? "Admin granted" : "Admin revoked" });
      await fetchUsers();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleBan = async (userId: string, ban: boolean) => {
    try {
      await adminService.banUser(userId, ban);
      toast({ title: ban ? "User banned" : "User unbanned" });
      await fetchUsers();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleDeleteTestUser = async (userId: string) => {
    try {
      await adminService.deleteTestUser(userId);
      toast({ title: "Test account deleted" });
      await fetchUsers();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const openCreateModal = (role?: "farmer" | "customer") => {
    setPresetRole(role);
    setModalOpen(true);
  };

  const roleBadge = (u: AdminUser) => {
    if (u.isAdmin) return "bg-purple-100 text-purple-700";
    if (u.role === "farmer") return "bg-primary/10 text-primary";
    return "bg-blue-50 text-blue-600";
  };

  const filterTabs = [
    { key: "all", label: "All Users" },
    { key: "farmer", label: "Farmers" },
    { key: "customer", label: "Customers" },
    { key: "admin", label: "Admins" },
    { key: "test", label: "Test Accounts" },
  ] as const;

  return (
    <AdminGuard>
      <AdminLayout title="Users Management">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm" onClick={() => openCreateModal()} className="gap-1.5">
            <UserPlus className="w-4 h-4" /> Create Test User
          </Button>
          <Button size="sm" variant="outline" onClick={() => openCreateModal("farmer")} className="gap-1.5">
            <UserPlus className="w-4 h-4" /> Test Farmer
          </Button>
          <Button size="sm" variant="outline" onClick={() => openCreateModal("customer")} className="gap-1.5">
            <UserPlus className="w-4 h-4" /> Test Customer
          </Button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRoleFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  roleFilter === tab.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : error ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-muted-foreground">Failed to load users</p>
            <Button variant="outline" onClick={() => fetchUsers()} className="gap-2"><RefreshCw className="w-4 h-4" /> Retry</Button>
          </div>
        ) : paged.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No users match your filters</p>
        ) : (
          <>
            <div className="space-y-3">
              {paged.map((u) => (
                <div key={u.id} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{u.name || "Unnamed"}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadge(u)}`}>
                          {u.isAdmin ? "Admin" : u.role}
                        </span>
                        {u.is_test_account && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">
                            Test
                          </span>
                        )}
                        {u.plan && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground capitalize">{u.plan}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email ?? "No email"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap">
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as "farmer" | "customer")}>
                        <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="farmer">Farmer</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant={u.isAdmin ? "destructive" : "outline"}
                        onClick={() => handleToggleAdmin(u.id, !u.isAdmin)}
                        className="rounded-full text-xs h-8"
                      >
                        {u.isAdmin ? <ShieldOff className="w-3 h-3 mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
                        {u.isAdmin ? "Revoke" : "Admin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBan(u.id, true)}
                        className="rounded-full text-xs h-8 text-destructive hover:text-destructive"
                      >
                        <Ban className="w-3 h-3 mr-1" /> Ban
                      </Button>
                      {u.is_test_account && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTestUser(u.id)}
                          className="rounded-full text-xs h-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm text-muted-foreground">Page {safePage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center mt-2">{filtered.length} user{filtered.length !== 1 ? "s" : ""} total</p>
          </>
        )}

        <CreateTestUserModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onCreated={() => fetchUsers()}
          presetRole={presetRole}
        />
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminUsers;
