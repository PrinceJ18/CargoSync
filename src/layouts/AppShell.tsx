import { useState } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Search, Bell, Navigation, ChevronDown } from "lucide-react";
import { C, font, mono } from "../data/prototype/designTokens";
import { supabase } from "../lib/supabase/client";

import { useAuth } from "../contexts/AuthContext";

const NAV_ITEMS = [
  { label: "Overview", path: "/app/overview" },
  { label: "Orders", path: "/app/orders" },
  { label: "Fleet", path: "/app/fleet" },
  { label: "Network", path: "/app/network" },
  { label: "Optimize", path: "/app/optimize" },
  { label: "Routes", path: "/app/routes" },
  { label: "Impact", path: "/app/impact" },
];

/**
 * AppShell — the authenticated application layout.
 * Wraps all /app/* routes with the TopNav and shared background.
 */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const { user, profile, isLoading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Safe display fallbacks
  let displayName = "Loading...";
  let displayRole = "Loading";
  let displayInitials = "--";

  if (!isLoading) {
    if (profile?.role === 'ADMIN') {
      displayName = "CargoSync Admin";
      displayRole = "System Admin";
      displayInitials = "AD";
    } else if (profile?.role === 'OPERATOR') {
      displayName = profile.operator_name || "Business Dashboard";
      displayRole = "Operator Workspace";
      displayInitials = displayName.substring(0, 2).toUpperCase();
    } else {
      displayName = profile?.email?.split('@')[0] || user?.email?.split('@')[0] || "User";
      displayRole = "Unknown Role";
      displayInitials = displayName.substring(0, 2).toUpperCase();
    }
  }

  return (
    <div style={{ fontFamily: font, background: C.stone, minHeight: "100vh" }}>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Top Navigation */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 26px", borderBottom: `1px solid ${C.stone}`, background: C.ivory, position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <Link to="/app/overview" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Navigation size={11} color={C.ivory} strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>CargoSync</span>
          </Link>
          <div style={{ display: "flex", gap: 4 }}>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.label} to={item.path} style={{
                  background: isActive ? C.stone : "transparent",
                  border: "none", textDecoration: "none",
                  padding: "7px 13px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                  color: isActive ? C.ink : "#5B5E68",
                }}>{item.label}</Link>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Search size={16} color={C.slate} style={{ cursor: "pointer" }} />
          <Bell size={16} color={C.slate} style={{ cursor: "pointer" }} />
          <div style={{ fontSize: 11, fontFamily: mono, color: C.emerald, display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald }} /> LIVE
          </div>
          <div style={{ position: "relative" }}>
            <div onClick={() => setMenu(!menu)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.stone}` }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.navy, color: C.ivory, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{displayInitials}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1 }}>{displayName}</div>
                <div style={{ fontSize: 10, color: C.slate, lineHeight: 1.1 }}>{displayRole}</div>
              </div>
              <ChevronDown size={13} color={C.slate} />
            </div>
            {menu && (
              <div style={{ position: "absolute", right: 0, top: 42, background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, width: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                {["Profile", "Settings", "Workspace"].map((m) => (
                  <div key={m} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>{m}</div>
                ))}
                <div onClick={handleLogout} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", color: C.red, borderTop: `1px solid ${C.stone}` }}>Sign out</div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Page content outlet */}
      <Outlet />
    </div>
  );
}
