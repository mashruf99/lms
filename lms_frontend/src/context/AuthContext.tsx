'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type User = {
  id: number;
  username: string;
  email: string;
  role: {
    id: number;
    name: string;
  };
};

type AuthContextType = {
  user: User | null;
  role: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user ?? null);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (active) {
          setUser(data.user ?? null);
        }
      } catch (err) {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role?.name ?? null,
        loading,
        refetch: fetchUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
