import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export const ProtectedRoute: React.FC = () => {
  const { session, isLoading, authError, retryAuth } = useAuth();

  if (isLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#14171F", color: "#F3EEE3", fontFamily: "Inter, sans-serif" }}>
        Loading CargoSync AI...
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#14171F", color: "#F3EEE3", fontFamily: "Inter, sans-serif" }}>
        <div style={{ marginBottom: 16, fontSize: 16 }}>{authError.message}</div>
        <button 
          onClick={retryAuth}
          style={{ padding: "8px 16px", borderRadius: 4, background: "#E8542E", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
