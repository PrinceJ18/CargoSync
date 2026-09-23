import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";
import { C, font } from "../data/prototype/designTokens";
import { useMobile } from "../hooks/useMobile";
import { supabase } from "../lib/supabase/client";
import CargoSyncBanner from "../assets/branding/CargoSync_Banner_WhiteBg.png";
import CargoSyncLogo from "../assets/branding/CargoSync_Logo.png";

export function LoginPage() {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [mode, setMode] = useState<"select" | "business" | "admin">("select");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear errors when toggling modes
  useEffect(() => {
    setError(null);
    setEmail("");
    setPassword("");
  }, [mode, isSignUp]);

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        // Depending on Supabase settings, sign up may automatically log them in
        // or require email confirmation. We'll attempt to navigate.
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      // If successful, navigate to app
      navigate("/app/overview");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "select") {
    return (
      <div className="fade-in" style={{ minHeight: "100vh", background: C.ivory, fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}>
        
        {/* Subtle Network Pattern */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03, pointerEvents: "none" }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-light" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={C.navy} strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-light)" />
            <circle cx="20%" cy="30%" r="4" fill={C.coral} />
            <circle cx="80%" cy="60%" r="6" fill={C.coral} />
            <path d="M 20% 30% L 80% 60%" fill="none" stroke={C.coral} strokeWidth="1" strokeDasharray="4 4"/>
          </svg>
        </div>

        {/* Top Header / Back Button */}
        <div style={{ width: "100%", padding: "24px 5%", display: "flex", justifyContent: "flex-start", position: "relative", zIndex: 1, maxWidth: 1200 }}>
          <Link to="/" aria-label="Go back" style={{ fontSize: 13, color: C.slate, fontWeight: 500, cursor: "pointer", background: "#fff", border: `1px solid rgba(20, 23, 31, 0.1)`, borderRadius: 6, padding: "8px 14px", textDecoration: "none", transition: "all 0.2s ease", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }} className="c-card-hover">
            ← Back
          </Link>
        </div>

        {/* Center Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", padding: isMobile ? "0 5% 40px" : "0 24px 60px", position: "relative", zIndex: 1 }}>
          
          <img src={CargoSyncLogo} alt="CargoSync Logo" style={{ height: 44, objectFit: "contain", marginBottom: 32 }} />
          
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: 12 }}>Choose your workspace</h1>
            <p style={{ fontSize: 16, color: C.slate, margin: 0 }}>Select the workspace you need to access CargoSync.</p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24, width: "100%", maxWidth: 840 }}>
            <RoleCard 
              icon={<Building2 size={22} color={C.coral} />} 
              title="Business / Operator" 
              desc="Manage your logistics operations." 
              features={["Orders & vehicles", "Routes & optimization", "Shared-capacity opportunities"]} 
              cta="Continue as Business" 
              onClick={() => setMode("business")} 
              accent 
            />
            <RoleCard 
              icon={<ShieldCheck size={22} color={C.navy} />} 
              title="Admin Console" 
              desc="Manage the CargoSync network." 
              features={["All operators & orders", "Optimization & results", "Network-wide analytics"]} 
              cta="Continue as Admin" 
              onClick={() => setMode("admin")} 
            />
          </div>
        </div>
      </div>
    );
  }

  const isBiz = mode === "business";
  return (
    <div className="fade-in" style={{ minHeight: "100vh", background: C.ivory, fontFamily: font, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
      <style>{`
        .login-input {
          width: 100%; box-sizing: border-box; padding: 12px 16px; border-radius: 6px; border: 1px solid rgba(20, 23, 31, 0.12); font-size: 14.5px; outline: none; transition: all 0.2s ease; background: #fff; color: ${C.ink};
        }
        .login-input:focus {
          border-color: ${C.coral};
          box-shadow: 0 0 0 3px rgba(232,84,46,0.12);
        }
        .login-input::placeholder {
          color: rgba(20, 23, 31, 0.4);
        }
      `}</style>

      {/* LEFT PANEL */}
      <div style={{ display: "flex", flexDirection: "column", padding: isMobile ? "40px 6%" : "60px 8%", background: C.navy, color: C.ivory, position: "relative", overflow: "hidden" }}>
        {/* Subtle Network Pattern */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05, pointerEvents: "none" }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={C.ivory} strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="20%" cy="30%" r="4" fill={C.coral} />
            <circle cx="70%" cy="60%" r="6" fill={C.coral} />
            <circle cx="40%" cy="80%" r="3" fill={C.coral} />
            <path d="M 20% 30% L 70% 60% L 40% 80%" fill="none" stroke={C.coral} strokeWidth="1" strokeDasharray="4 4"/>
          </svg>
        </div>

        {/* Top Header */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isMobile ? 40 : 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(250,246,239,0.7)" }}>CARGOSYNC AI</div>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: "rgba(250,246,239,0.4)", marginTop: 4 }}>LOGISTICS INTELLIGENCE PLATFORM</div>
          </div>
          <button aria-label="Go back to workspace selection" onClick={() => setMode("select")} style={{ fontSize: 13, color: "rgba(250,246,239,0.8)", fontWeight: 500, cursor: "pointer", background: "none", border: "1px solid rgba(250,246,239,0.2)", borderRadius: 4, padding: "6px 12px", transition: "all 0.2s" }} className="c-card-hover">
            ← Back
          </button>
        </div>

        {/* Center Presentation */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", zIndex: 1, maxWidth: 460, margin: "0 auto", width: "100%", padding: isMobile ? "20px 0" : "0" }}>
          <div style={{ background: C.ivory, padding: "34px 44px", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", marginBottom: 36, display: "flex", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
            <img 
              src={CargoSyncBanner} 
              alt="CargoSync — Smarter Logistics. Fewer Empty Miles." 
              style={{ width: "100%", maxWidth: 320, objectFit: "contain" }} 
            />
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: C.ivory, lineHeight: 1.35, marginBottom: 14, letterSpacing: "-0.01em" }}>
            Smarter logistics coordination for a more efficient network.
          </div>
          <div style={{ fontSize: 15.5, color: "rgba(250,246,239,0.6)", lineHeight: 1.5 }}>
            Connect operators, optimize routes, and reduce empty miles.
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 6%", background: C.ivory }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          
          {/* Mode Switcher */}
          <div style={{ display: "flex", background: "rgba(20, 23, 31, 0.05)", borderRadius: 8, padding: 4, marginBottom: 44 }}>
            <button 
              onClick={() => { setMode("business"); setError(null); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 6, background: isBiz ? "#fff" : "transparent", color: isBiz ? C.coral : C.slate, fontWeight: 600, fontSize: 13.5, cursor: "pointer", boxShadow: isBiz ? "0 2px 8px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s ease" }}
            >
              Business Portal
            </button>
            <button 
              onClick={() => { setMode("admin"); setError(null); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 6, background: !isBiz ? "#fff" : "transparent", color: !isBiz ? C.coral : C.slate, fontWeight: 600, fontSize: 13.5, cursor: "pointer", boxShadow: !isBiz ? "0 2px 8px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s ease" }}
            >
              Admin Console
            </button>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: C.ink, letterSpacing: "-0.01em" }}>
            {isBiz ? "Business Portal" : "Admin Console"}
          </h2>
          <div style={{ fontSize: 14.5, color: C.slate, marginBottom: 32, lineHeight: 1.5 }}>
            {isSignUp ? "Create a new account." : (isBiz ? "Sign in to continue to your logistics workspace." : "Sign in to access CargoSync administration and control tools.")}
          </div>
          
          {error && (
            <div className="fade-in" style={{ padding: "12px 16px", background: "rgba(232,84,46,0.08)", color: C.coral, borderRadius: 6, fontSize: 13.5, marginBottom: 24, border: `1px solid rgba(232,84,46,0.15)` }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label htmlFor="login-email" style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Email</label>
              <input 
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
                className="login-input"
              />
            </div>
            
            <div>
              <label htmlFor="login-password" style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Password</label>
              <input 
                id="login-password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="login-input"
              />
            </div>
          </div>
          
          <button 
            className="c-btn-primary"
            onClick={handleAuth} 
            disabled={loading}
            style={{
              width: "100%", marginTop: 32, background: C.coral, color: C.ivory, border: "none", padding: "14px", borderRadius: 6,
              fontSize: 15, fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, transition: "background 0.2s ease"
            }}
          >
            {loading ? "Authenticating..." : isSignUp ? "Sign Up" : isBiz ? "Sign in to Business Portal" : "Sign in to Admin Console"}
          </button>
          
          <div style={{ fontSize: 13.5, color: C.slate, marginTop: 24, textAlign: "center" }}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button aria-label={isSignUp ? "Switch to Sign In" : "Switch to Sign Up"} onClick={() => setIsSignUp(!isSignUp)} style={{ color: C.coral, cursor: "pointer", fontWeight: 600, background: "none", border: "none", padding: 0 }}>
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, desc, features, cta, onClick, accent }: any) {
  const [hover, setHover] = useState(false);
  return (
    <div 
      className="c-card-hover"
      onMouseEnter={() => setHover(true)} 
      onMouseLeave={() => setHover(false)} 
      style={{
        border: `1px solid ${hover ? (accent ? C.coral : C.navy) : 'rgba(20, 23, 31, 0.08)'}`, 
        borderRadius: 12, padding: "32px 28px",
        background: "#fff", display: "flex", flexDirection: "column", gap: 20,
        boxShadow: hover ? "0 12px 32px rgba(0,0,0,0.08)" : "0 4px 12px rgba(0,0,0,0.03)",
        transition: "all 0.3s ease",
        transform: hover ? "translateY(-4px)" : "translateY(0)"
      }}
    >
      {/* Icon Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: accent ? "rgba(232,84,46,0.1)" : "rgba(20, 23, 31, 0.06)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s ease" }}>
          {icon}
        </div>
        {accent ? <RoleMicroBusiness animate={hover} /> : <RoleMicroAdmin animate={hover} />}
      </div>
      
      {/* Titles */}
      <div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>{title}</div>
        <div style={{ fontSize: 14.5, color: C.slate, lineHeight: 1.5 }}>{desc}</div>
      </div>
      
      {/* Features List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, marginTop: 4 }}>
        {features.map((f: string) => (
          <div key={f} style={{ fontSize: 13.5, color: C.slate, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: accent ? C.coral : C.navy, opacity: 0.8 }} /> 
            {f}
          </div>
        ))}
      </div>
      
      {/* CTA Button */}
      <button 
        onClick={onClick} 
        style={{
          marginTop: 8, 
          background: accent ? C.coral : C.navy, 
          color: C.ivory, 
          border: "none",
          padding: "14px", 
          borderRadius: 6, 
          fontSize: 14.5, 
          fontWeight: 600, 
          cursor: "pointer",
          transition: "all 0.2s ease",
          opacity: hover ? 1 : 0.95
        }}
      >
        {cta}
      </button>
    </div>
  );
}

function RoleMicroBusiness({ animate }: { animate: boolean }) {
  return (
    <svg width="56" height="20" viewBox="0 0 56 20">
      <line x1="2" y1="14" x2="54" y2="14" stroke={C.stone} strokeWidth="1.5" />
      <rect x="4" y="4" width="10" height="8" rx="1.5" fill={C.coral} style={{ transition: "transform 0.4s ease", transform: animate ? "translateX(36px)" : "translateX(0)" }} />
    </svg>
  );
}
function RoleMicroAdmin({ animate }: { animate: boolean }) {
  return (
    <svg width="56" height="20" viewBox="0 0 56 20">
      <circle cx="8" cy="10" r="3" fill={C.navy} />
      <circle cx="28" cy="4" r="2.5" fill={C.slate} opacity={animate ? 1 : 0.6} />
      <circle cx="30" cy="16" r="2.5" fill={C.slate} opacity={animate ? 1 : 0.6} />
      <circle cx="48" cy="9" r="2.5" fill={C.slate} opacity={animate ? 1 : 0.6} />
      <line x1="8" y1="10" x2="28" y2="4" stroke={C.navy} strokeWidth="1" opacity="0.4" />
      <line x1="8" y1="10" x2="30" y2="16" stroke={C.navy} strokeWidth="1" opacity="0.4" />
      <line x1="8" y1="10" x2="48" y2="9" stroke={C.navy} strokeWidth="1" opacity="0.4" />
    </svg>
  );
}
