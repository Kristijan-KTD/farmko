import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminContextType {
  isAdmin: boolean;
  isLoading: boolean;
  adminAction: <T = any>(action: string, params?: Record<string, any>) => Promise<T>;
}

const AdminContext = createContext<AdminContextType>({} as AdminContextType);

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!session) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        // Try a lightweight admin action to verify
        const { data, error } = await supabase.functions.invoke("admin", {
          body: { action: "get_dashboard_stats" },
        });
        setIsAdmin(!error && !data?.error);
      } catch {
        setIsAdmin(false);
      }
      setIsLoading(false);
    };

    checkAdmin();
  }, [session]);

  const adminAction = async <T = any>(action: string, params: Record<string, any> = {}): Promise<T> => {
    const { data, error } = await supabase.functions.invoke("admin", {
      body: { action, ...params },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data as T;
  };

  return (
    <AdminContext.Provider value={{ isAdmin, isLoading, adminAction }}>
      {children}
    </AdminContext.Provider>
  );
};
