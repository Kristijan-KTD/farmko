import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "farmer" | "customer";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  location?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;
  register: (name: string, email: string, password: string, role: UserRole) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, _password: string) => {
    // Mock login - will be replaced with Lovable Cloud
    setUser({
      id: "1",
      name: "John Doe",
      email,
      role: "farmer",
      avatar: "",
      location: "Springfield, IL",
      bio: "Local organic farmer",
    });
  };

  const register = (name: string, email: string, _password: string, role: UserRole) => {
    setUser({
      id: "1",
      name,
      email,
      role,
      avatar: "",
    });
  };

  const logout = () => setUser(null);

  const updateProfile = (updates: Partial<User>) => {
    if (user) setUser({ ...user, ...updates });
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, register, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
