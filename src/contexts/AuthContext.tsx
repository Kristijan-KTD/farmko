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

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  "farmer@farmko.com": {
    password: "farmer123",
    user: { id: "1", name: "John Doe", email: "farmer@farmko.com", role: "farmer", avatar: "", location: "Springfield, IL", bio: "Local organic farmer" },
  },
  "customer@farmko.com": {
    password: "customer123",
    user: { id: "2", name: "Jane Smith", email: "customer@farmko.com", role: "customer", avatar: "", location: "Chicago, IL", bio: "Fresh food lover" },
  },
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, _password: string) => {
    const mockUser = MOCK_USERS[email];
    if (mockUser) {
      setUser({ ...mockUser.user });
    } else {
      // Fallback for any email
      setUser({
        id: "1",
        name: "John Doe",
        email,
        role: "farmer",
        avatar: "",
        location: "Springfield, IL",
        bio: "Local organic farmer",
      });
    }
  };

  const register = (name: string, email: string, _password: string, role: UserRole) => {
    setUser({
      id: String(Date.now()),
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
