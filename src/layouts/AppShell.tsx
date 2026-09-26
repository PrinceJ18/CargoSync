import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Search, Bell, ChevronDown, Menu, X } from "lucide-react";
import { C, font, mono } from "../data/prototype/designTokens";
import { supabase } from "../lib/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { useMobile } from "../hooks/useMobile";
import CargoSyncLogo from "../assets/branding/CargoSync_Logo.png";
import CargoSyncNameTagline from "../assets/branding/CargoSync_name_tagline.png";

const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", path: "/app/overview" },
  { label: "Operators", path: "/app/operators" },
  { label: "Orders", path: "/app/orders" },
  { label: "Vehicles", path: "/app/fleet" },
  { label: "Optimization Center", path: "/app/optimize" },
  { label: "Optimization Results", path: "/app/optimize-results" },
  { label: "Routes", path: "/app/routes" },
  { label: "Analytics", path: "/app/analytics" },
];

const OPERATOR_NAV_ITEMS = [
  { label: "Dashboard", path: "/app/overview" },
  { label: "My Orders", path: "/app/orders" },
  { label: "My Vehicles", path: "/app/fleet" },
  { label: "Return Loads", path: "/app/network" },
  { label: "Optimization", path: "/app/optimize" },
  { label: "Assigned Routes", path: "/app/routes" },
  { label: "My Analytics", path: "/app/impact" },
];

/**
 * AppShell — the authenticated application layout.
 * Wraps all /app/* routes with the TopNav and shared background.
 */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useMobile();
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, profile, isLoading } = useAuth();

  // Close dropdown and mobile nav on route change
  useEffect(() => {
    setMenu(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Close mobile nav on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
        setMenu(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!menu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menu]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/");
  }, [navigate]);

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
      displayName = "Rahul Sharma";
      displayRole = "Operations Operator";
      displayInitials = "RS";
    } else {
      displayName = profile?.email?.split('@')[0] || user?.email?.split('@')[0] || "User";
      displayRole = "Unknown Role";
      displayInitials = displayName.substring(0, 2).toUpperCase();
    }
  }

  return (
    <div style={{ fontFamily: font, background: C.stone, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Helper to adapt labels for operators */}
      {(() => {
        // defined here to avoid recreating on each render but keep access to profile
      })()}

      {/* Top Navigation */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 26px", borderBottom: `1px solid ${C.stone}`, background: C.ivory, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button aria-label="Toggle mobile menu" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(!mobileNavOpen)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
                {mobileNavOpen ? <X size={20} color={C.slate} /> : <Menu size={20} color={C.slate} />}
              </button>
            )}
            <Link to="/app/overview" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }} aria-label="CargoSync">
              <img 
                src={CargoSyncLogo} 
                alt="" 
                style={{ width: 22, height: 22, objectFit: "contain" }} 
              />
              {!isMobile && (
                <img 
                  src={CargoSyncNameTagline} 
                  alt="CargoSync" 
                  style={{ height: 20, objectFit: "contain" }} 
                />
              )}
            </Link>
          </div>

          {!isMobile && (
            <div style={{ display: "flex", gap: 4 }}>
              {(profile?.role === 'ADMIN' ? ADMIN_NAV_ITEMS : OPERATOR_NAV_ITEMS).map((item) => {
                const isActive = location.pathname === item.path || (item.path !== "/app/overview" && location.pathname.startsWith(item.path + "/"));
                return (
                  <Link key={item.label} to={item.path} className="c-btn-hover" style={{
                    background: isActive ? C.navy : "transparent",
                    border: "none", textDecoration: "none",
                    padding: "7px 13px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                    color: isActive ? C.ivory : "#5B5E68",
                    boxShadow: isActive ? "0 4px 12px rgba(27,35,51,0.15)" : "none",
                  }}>{item.label}</Link>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
          {!isMobile && (
            <>
              <button aria-label="Search" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <Search size={16} color={C.slate} />
              </button>
              <button aria-label="Notifications" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <Bell size={16} color={C.slate} />
              </button>
              <div style={{ fontSize: 11, fontFamily: mono, color: C.emerald, display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald }} /> LIVE
              </div>
            </>
          )}
          <div style={{ position: "relative" }} ref={menuRef}>
            <button 
              className="c-btn-hover"
              aria-label="User menu"
              aria-expanded={menu}
              aria-haspopup="true"
              onClick={() => setMenu(!menu)} 
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.stone}`, background: "none", textAlign: "left" }}
            >
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.navy, color: C.ivory, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{displayInitials}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1 }}>{displayName}</div>
                <div style={{ fontSize: 10, color: C.slate, lineHeight: 1.1 }}>{displayRole}</div>
              </div>
              <ChevronDown size={13} color={C.slate} />
            </button>
            {menu && (
              <div role="menu" style={{ position: "absolute", right: 0, top: 42, background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, width: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", overflow: "hidden", zIndex: 50 }}>
                {["Profile", "Settings", "Workspace"].map((m) => (
                  <button role="menuitem" key={m} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, cursor: "pointer", background: "none", border: "none" }}>{m}</button>
                ))}
                <button role="menuitem" onClick={handleLogout} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, cursor: "pointer", color: C.coral, borderTop: `1px solid ${C.stone}`, background: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" }}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Nav Overlay */}
      {isMobile && mobileNavOpen && (
        <div className="fade-in" style={{ position: "fixed", inset: "54px 0 0 0", zIndex: 40, background: C.ivory, borderTop: `1px solid ${C.stone}`, padding: "20px 26px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {(profile?.role === 'ADMIN' ? ADMIN_NAV_ITEMS : OPERATOR_NAV_ITEMS).map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/app/overview" && location.pathname.startsWith(item.path + "/"));
            return (
              <Link key={item.label} to={item.path} className="c-btn-hover" onClick={() => setMobileNavOpen(false)} style={{
                background: isActive ? C.navy : "transparent",
                border: "none", textDecoration: "none",
                padding: "10px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600,
                color: isActive ? C.ivory : "#5B5E68",
                boxShadow: isActive ? "0 4px 12px rgba(27,35,51,0.15)" : "none",
              }}>{item.label}</Link>
            );
          })}
        </div>
      )}

      {/* Page content outlet */}
      <main style={{ flex: 1, minHeight: 0 }}>
        <div key={location.pathname} className="fade-in" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

