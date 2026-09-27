import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase/client";
import { request } from "../services/apiClient";
import type { ApiError } from "../types/api";
import { useDemo } from "./DemoContext";

export interface Profile {
  id: string;
  role: 'ADMIN' | 'OPERATOR';
  operator_id: string | null;
  operator_name: string | null;
  email: string | null;
}

interface AuthContextState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  authError: ApiError | null;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<ApiError | null>(null);

  // ─── Demo Mode Integration ─────────────────────────────────────
  // When demo mode is active, we provide a synthetic profile
  // without touching Supabase at all.
  const { isDemo, demoRole } = useDemo();

  const fetchProfile = async () => {
    setAuthError(null);
    try {
      const data = await request<Profile>("/auth/me");
      setProfile(data);
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
      const apiErr = err as ApiError;
      if (apiErr.code === "UNAUTHENTICATED") {
        await supabase.auth.signOut();
        setProfile(null);
      } else {
        setAuthError(apiErr);
      }
    }
  };

  const retryAuth = () => {
    setIsLoading(true);
    setAuthError(null);
    if (isDemo) {
      // In demo mode, just re-apply the synthetic profile
      setIsLoading(false);
    } else if (session?.user) {
      fetchProfile().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  };

  // ─── Demo Mode Effect ──────────────────────────────────────────
  // When demo mode activates/deactivates, update the profile accordingly.
  useEffect(() => {
    if (isDemo && demoRole) {
      // Provide a synthetic profile matching the reference accounts
      if (demoRole === "ADMIN") {
        setProfile({
          id: "demo-admin",
          role: "ADMIN",
          operator_id: null,
          operator_name: null,
          email: "demo-admin@cargosync.ai",
        });
      } else {
        // OPERATOR — matches Shree Balaji Logistics (Operator 1)
        setProfile({
          id: "demo-operator",
          role: "OPERATOR",
          operator_id: "11111111-1111-1111-1111-111111111111",
          operator_name: "Shree Balaji Logistics",
          email: "demo-business@cargosync.ai",
        });
      }
      setAuthError(null);
      setIsLoading(false);
    }
  }, [isDemo, demoRole]);

  // ─── Normal Supabase Auth (unchanged) ──────────────────────────
  useEffect(() => {
    // Skip real auth initialization when in demo mode
    if (isDemo) {
      setIsLoading(false);
      return;
    }

    // 1. Initialize session on mount
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error("Error retrieving Supabase session:", error.message);
      }
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile();
      } else {
        setProfile(null);
      }
      
      setIsLoading(false);
    });

    // 2. Listen to auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch profile async without blocking immediate UI state, although
        // typically you might want to show loading. For seamless UX, we fetch.
        await fetchProfile();
      } else {
        setProfile(null);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isDemo]);

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, authError, retryAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
