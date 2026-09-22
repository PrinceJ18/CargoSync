import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase/client";
import { request } from "../services/apiClient";
import type { ApiError } from "../types/api";

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
    if (session?.user) {
      fetchProfile().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
  }, []);

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
