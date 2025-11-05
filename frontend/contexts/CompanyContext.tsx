"use client";

import { createContext, useContext, useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

type CompanyUser = { id: number; email: string; role: "admin" | "member" };

type CompanyContextType = {
  token: string | null;
  company: { id: number; name: string; logo_base64?: string | null } | null;
  user: CompanyUser | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [user, setUser] = useState<CompanyUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // pick up token from URL
    const params = new URLSearchParams(window.location.search);
    const ok = params.get("company_auth");
    const t = params.get("token");
    if (ok === "success" && t) {
      localStorage.setItem("company_token", t);
      window.history.replaceState({}, "", window.location.pathname);
    }
    const stored = localStorage.getItem("company_token");
    if (stored) setToken(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/company/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCompany(data.company);
          setUser({ id: data.user.id, email: data.user.email, role: data.user.role });
        }
      } catch {}
    })();
  }, [token]);

  const login = () => {
    window.location.href = `${API_BASE}/api/company/auth/google`;
  };

  const logout = () => {
    localStorage.removeItem("company_token");
    setToken(null);
    setCompany(null);
    setUser(null);
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });
  };

  return (
    <CompanyContext.Provider value={{ token, company, user, loading, login, logout, fetchWithAuth }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
