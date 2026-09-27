import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

/**
 * DemoContext — Manages a clearly isolated DEMO MODE state.
 *
 * This is completely separate from AuthContext and Supabase authentication.
 * When demo mode is active:
 *   - ProtectedRoute allows access without a Supabase session
 *   - AuthContext provides a synthetic profile (not a real user)
 *   - apiClient returns fixture data instead of calling the real backend
 *
 * Demo state is persisted in sessionStorage so it survives page refreshes
 * within the same browser tab, but is automatically cleared when the tab closes.
 */

export type DemoRole = "ADMIN" | "OPERATOR";

interface DemoContextState {
  /** Whether demo mode is currently active */
  isDemo: boolean;
  /** The role for the current demo session */
  demoRole: DemoRole | null;
  /** Enter demo mode with the specified role */
  enterDemo: (role: DemoRole) => void;
  /** Exit demo mode and clear all demo state */
  exitDemo: () => void;
}

const DEMO_STORAGE_KEY = "cargosync_demo_mode";

const DemoContext = createContext<DemoContextState | undefined>(undefined);

function loadDemoState(): { isDemo: boolean; demoRole: DemoRole | null } {
  try {
    const stored = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.isDemo && (parsed.demoRole === "ADMIN" || parsed.demoRole === "OPERATOR")) {
        return { isDemo: true, demoRole: parsed.demoRole };
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { isDemo: false, demoRole: null };
}

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState(loadDemoState);

  // Persist to sessionStorage whenever state changes
  useEffect(() => {
    if (state.isDemo) {
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } else {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    }
  }, [state]);

  const enterDemo = useCallback((role: DemoRole) => {
    setState({ isDemo: true, demoRole: role });
  }, []);

  const exitDemo = useCallback(() => {
    setState({ isDemo: false, demoRole: null });
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
  }, []);

  return (
    <DemoContext.Provider value={{ isDemo: state.isDemo, demoRole: state.demoRole, enterDemo, exitDemo }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
};
