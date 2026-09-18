import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";
import { C, font, mono } from "../data/prototype/designTokens";
import { supabase } from "../lib/supabase/client";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"select" | "business" | "admin">("select");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear errors when toggling modes
  useEffect(() => {
    setError(null);
    setEmail(mode === "business" ? "ops@malwaexpress.in" : mode === "admin" ? "admin@cargosync.ai" : "");
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
      <div style={{ minHeight: "100vh", background: C.ivory, fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <Link to="/" style={{ fontSize: 14, fontWeight: 600, color: C.ink, textDecoration: "none", marginBottom: 18, display: "block" }}>← CargoSync AI</Link>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.01em" }}>Choose your workspace</h1>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, width: "min(94%, 760px)" }}>
          <RoleCard icon={<Building2 size={20} color={C.coral} />} title="Business / Operator" desc="Manage your logistics operations." features={["Orders & vehicles", "Routes & optimization", "Shared-capacity opportunities"]} cta="Continue as Business" onClick={() => setMode("business")} accent />
          <RoleCard icon={<ShieldCheck size={20} color={C.navy} />} title="Admin" desc="Manage the CargoSync network." features={["All operators & orders", "Optimization & results", "Network-wide analytics"]} cta="Continue as Admin" onClick={() => setMode("admin")} />
        </div>
      </div>
    );
  }

  const isBiz = mode === "business";
  return (
    <div style={{ minHeight: "100vh", background: isBiz ? C.ivory : C.ink, fontFamily: font, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 8%", background: isBiz ? C.navy : C.ink, color: C.ivory }}>
        <div onClick={() => setMode("select")} style={{ fontSize: 13, color: "rgba(250,246,239,0.6)", cursor: "pointer", marginBottom: 26 }}>← Back</div>
        <div style={{ fontSize: 12, fontFamily: mono, color: isBiz ? C.peach : C.slate, marginBottom: 14 }}>
          {isBiz ? "FOR LOGISTICS OPERATORS" : "FOR CARGOSYNC ADMINISTRATORS"}
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.01em", maxWidth: 360, lineHeight: 1.15 }}>
          {isBiz ? "Your logistics network, coordinated." : "Network-wide logistics intelligence."}
        </h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 10%", background: C.ivory }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{isBiz ? "Business Portal" : "Admin Console"}</div>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 26 }}>{isSignUp ? "Create a new account." : "Sign in to continue."}</div>
        
        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(194,59,46,0.1)", color: C.red, borderRadius: 4, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 12, color: C.slate, marginBottom: 6 }}>Email</label>
        <input 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: "11px 14px", borderRadius: 4, border: `1px solid ${C.stone}`, marginBottom: 16, fontSize: 14 }} 
        />
        
        <label style={{ fontSize: 12, color: C.slate, marginBottom: 6 }}>Password</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ padding: "11px 14px", borderRadius: 4, border: `1px solid ${C.stone}`, marginBottom: 22, fontSize: 14 }} 
        />
        
        <button 
          onClick={handleAuth} 
          disabled={loading}
          style={{
            background: isBiz ? C.coral : C.ink, color: C.ivory, border: "none", padding: "13px", borderRadius: 4,
            fontSize: 14.5, fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Authenticating..." : isSignUp ? "Sign Up" : isBiz ? "Sign in to Business Portal" : "Sign in to Admin Console"}
        </button>
        
        <div style={{ fontSize: 12, color: C.slate, marginTop: 24, textAlign: "center" }}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <span onClick={() => setIsSignUp(!isSignUp)} style={{ color: C.coral, cursor: "pointer", fontWeight: 600 }}>
            {isSignUp ? "Sign In" : "Sign Up"}
          </span>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, desc, features, cta, onClick, accent }: any) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      border: `1px solid ${hover ? C.coral : accent ? C.coral : C.stone}`, borderRadius: 6, padding: 26,
      background: C.ivory, display: "flex", flexDirection: "column", gap: 16,
      transform: hover ? "translateY(-3px)" : "translateY(0)", transition: "transform 0.25s ease, border-color 0.25s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: accent ? "rgba(232,84,46,0.1)" : C.stone, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        {accent ? <RoleMicroBusiness animate={hover} /> : <RoleMicroAdmin animate={hover} />}
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: C.slate }}>{desc}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {features.map((f: string) => (
          <div key={f} style={{ fontSize: 12.5, color: "#4B4E58", display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: accent ? C.coral : C.navy }} /> {f}
          </div>
        ))}
      </div>
      <button onClick={onClick} style={{
        marginTop: "auto", background: accent ? C.coral : C.ink, color: C.ivory, border: "none",
        padding: "11px", borderRadius: 4, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
      }}>{cta}</button>
    </div>
  );
}

function RoleMicroBusiness({ animate }: { animate: boolean }) {
  const [x, setX] = useState(0);
  useEffect(() => {
    if (!animate) { setX(0); return; }
    const iv = setInterval(() => setX((v) => (v + 1) % 24), 60);
    return () => clearInterval(iv);
  }, [animate]);
  return (
    <svg width="56" height="20" viewBox="0 0 56 20">
      <line x1="2" y1="14" x2="54" y2="14" stroke={C.stone} strokeWidth="1.5" />
      <rect x={4 + x} y="4" width="10" height="8" rx="1.5" fill={C.coral} />
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
