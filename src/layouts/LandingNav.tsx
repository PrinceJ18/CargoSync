import { useNavigate, Link } from "react-router-dom";
import { Navigation } from "lucide-react";
import { C } from "../data/prototype/designTokens";

interface LandingNavProps {
  scrolled: boolean;
}

export function LandingNav({ scrolled }: LandingNavProps) {
  const navigate = useNavigate();
  const navItems = [
    { label: "Platform", id: "platform" },
    { label: "How it Works", id: "how-it-works" },
    { label: "Optimization", id: "optimization" },
    { label: "Impact", id: "impact" }
  ];

  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 90;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const offsetPosition = (elementRect - bodyRect) - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <nav style={{
      position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 50,
      width: "min(94%, 980px)", display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px 10px 20px", borderRadius: 999,
      background: scrolled ? "rgba(20,23,31,0.92)" : "rgba(20,23,31,0.72)",
      backdropFilter: "blur(14px)", 
      border: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(235,93,61,0.22)",
      boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.15)" : "0 8px 32px rgba(235,93,61,0.12)",
      transition: "all 0.3s ease",
    }}>
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Navigation size={13} color={C.ivory} strokeWidth={2.5} />
        </div>
        <span style={{ color: C.ivory, fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>CargoSync AI</span>
      </Link>
      <div style={{ display: "flex", gap: 26 }}>
        {navItems.map((it) => (
          <button 
            key={it.label} 
            onClick={() => handleScroll(it.id)}
            className="c-link-hover"
            style={{ 
              color: "rgba(250,246,239,0.72)", 
              fontSize: 13.5, 
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
              fontFamily: "inherit"
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link to="/login" className="c-link-hover" style={{ color: "rgba(250,246,239,0.7)", fontSize: 13, textDecoration: "none" }}>Business Portal</Link>
        <Link to="/login" className="c-link-hover" style={{ color: "rgba(250,246,239,0.7)", fontSize: 13, textDecoration: "none" }}>Admin Console</Link>
        <button className="c-btn-primary" onClick={() => navigate("/login")} style={{
          background: C.coral, color: C.ivory, border: "none", borderRadius: 999,
          padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        }}>Enter Platform</button>
      </div>
    </nav>
  );
}
