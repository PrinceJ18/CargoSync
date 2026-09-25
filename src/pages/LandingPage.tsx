import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMobile } from "../hooks/useMobile";
import { ArrowRight, MapPin } from "lucide-react";
import { LandingNav } from "../layouts/LandingNav";
import { HeroNetwork } from "../features/hero/HeroNetwork";
import { BeforeAfterToggle } from "../features/process/BeforeAfterToggle";
import { ProcessSection } from "../features/process/ProcessSection";
import { ReturnShowcase } from "../features/process/ReturnShowcase";
import { FeatureCard } from "../components/shared/FeatureCard";
import { NetworkMini, ClusterMini, RouteMini, ReturnMini, SavingsMini, CapacityMini } from "../components/ui/icons/Minis";
import { Reveal } from "../components/shared/Reveal";
import { C, font, mono } from "../data/prototype/designTokens";

export function LandingPage() {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <div style={{ background: C.ivory, fontFamily: font, color: C.ink }}>
      <LandingNav scrolled={scrolled} />

      {/* HERO */}
      <section id="platform" style={{ padding: isMobile ? "120px 6% 80px" : "160px 6% 120px", maxWidth: 1240, margin: "0 auto", position: "relative" }}>
        {/* Subtle glow for hero */}
        <div style={{ position: "absolute", top: 100, right: 0, width: 600, height: 600, background: `radial-gradient(circle, ${C.coral} 0%, transparent 70%)`, opacity: 0.04, filter: "blur(60px)", pointerEvents: "none" }} />
        
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 0.9fr", gap: isMobile ? 40 : 60, alignItems: "center", position: "relative", zIndex: 1 }}>
          <div>
            <Reveal delay={0}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: mono, color: C.slate, marginBottom: 22, border: `1px solid ${C.stone}`, padding: "5px 10px", borderRadius: 999 }}>
                <MapPin size={12} color={C.coral} /> REGIONAL NETWORK · LIVE OPERATIONS
              </div>
              <h1 style={{ fontSize: "clamp(38px, 5vw, 62px)", fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.02em", margin: 0 }}>
                Smarter Logistics.<br />Fewer Empty Miles.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p style={{ fontSize: 17, color: "#4B4E58", maxWidth: 460, marginTop: 22, lineHeight: 1.6 }}>
                CargoSync coordinates shared logistics capacity across multiple operators, optimizes delivery routes, and matches compatible return shipments.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
                <button className="c-btn-primary" onClick={() => navigate("/login")} style={{ background: C.ink, color: C.ivory, border: "none", padding: "14px 24px", borderRadius: 4, fontSize: 14.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  Explore the platform <ArrowRight size={15} />
                </button>
                <button className="c-btn-secondary" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "transparent", color: C.ink, border: `1px solid ${C.stone}`, padding: "14px 24px", borderRadius: 4, fontSize: 14.5, fontWeight: 500, cursor: "pointer" }}>
                  See how it works
                </button>
              </div>
            </Reveal>
            <Reveal delay={0.3}>
              <div style={{ display: "flex", gap: 26, marginTop: 46 }}>
                {["Shared Capacity", "Route Optimization", "Return-Load Matching"].map((t) => (
                  <div key={t} style={{ fontSize: 12.5, color: C.slate, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.coral }} /> {t}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.4}>
            <div style={{ background: C.navy, borderRadius: 10, padding: 22, position: "relative" }}>
              <div className="ambient-glow" style={{ position: "absolute", top: "50%", left: "50%", width: "130%", height: "130%", background: `radial-gradient(circle, ${C.coral} 0%, transparent 60%)`, filter: "blur(50px)", opacity: 0.15, zIndex: 0 }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <HeroNetwork />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PROBLEM -> SOLUTION: interactive before/after */}
      <section style={{ borderTop: `1px solid rgba(23, 28, 43, 0.06)`, padding: "100px 6%", position: "relative" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(28px,3.5vw,40px)", fontWeight: 700, letterSpacing: "-0.01em", maxWidth: 640, marginBottom: 40 }}>
              Logistics is a network problem.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <BeforeAfterToggle />
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ borderTop: `1px solid rgba(23, 28, 43, 0.06)`, padding: "100px 6%", position: "relative" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(28px,3.5vw,40px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 40 }}>
              How CargoSync works.
            </h2>
          </Reveal>
          <ProcessSection />
        </div>
      </section>

      {/* RETURN LOAD SHOWCASE */}
      <section style={{ background: C.cream, padding: "100px 6%", borderTop: `1px solid rgba(23, 28, 43, 0.03)` }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(28px,3.5vw,40px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 40 }}>
              The return journey matters.
            </h2>
          </Reveal>
          <ReturnShowcase />
        </div>
      </section>

      {/* FEATURES */}
      <section id="optimization" style={{ padding: "100px 6%" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(28px,3.5vw,40px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 40 }}>
              One network. Multiple advantages.
            </h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 18 }}>
            <FeatureCard delay={0.05} n="01" title="Shared Capacity" text="Coordinate delivery demand across multiple operators instead of routing in isolation." mini={<NetworkMini />} />
            <FeatureCard delay={0.10} n="02" title="Geographic Clustering" text="DBSCAN groups geographically dense delivery requests into feasible service pockets." mini={<ClusterMini />} />
            <FeatureCard delay={0.15} n="03" title="Constrained Routing" text="OR-Tools generates a feasible route considering vehicle capacity and configured constraints." mini={<RouteMini />} />
            <FeatureCard delay={0.20} n="04" title="Return-Load Matching" text="Finds compatible cargo for the return journey, turning empty miles into revenue." mini={<ReturnMini />} />
            <FeatureCard delay={0.25} n="05" title="Measurable Savings" text="Compares baseline independent routing against CargoSync's coordinated result." mini={<SavingsMini />} />
            <FeatureCard delay={0.30} n="06" title="Network Visibility" text="Visualize routes, vehicles and operational impact across the entire network." mini={<CapacityMini />} />
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="impact" style={{ background: C.cream, padding: "100px 6%", borderTop: `1px solid rgba(23, 28, 43, 0.03)` }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(28px,3.5vw,40px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 12 }}>
              From routes to results.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ fontSize: 13, fontFamily: mono, color: C.slate, marginBottom: 40 }}>REGIONAL NETWORK · LIVE OPERATIONS</div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(6, 1fr)", gap: 14 }}>
            {[
              { l: "Distance Reduced", v: "23%" }, { l: "Cost Reduced", v: "27%" }, { l: "Utilization", v: "77%" },
              { l: "Empty Returns Reduced", v: "61%" }, { l: "Return Loads", v: "8" }, { l: "Est. CO₂ Reduced", v: "18%" },
            ].map((m, i) => (
              <Reveal key={m.l} delay={0.15 + (i * 0.05)}>
                <div className="c-card-hover" style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: "20px 16px", height: "100%", cursor: "default" }}>
                  <div className="c-icon" style={{ fontSize: 26, fontWeight: 700, transformOrigin: "left center" }}>{m.v}</div>
                  <div style={{ fontSize: 12, color: C.slate, marginTop: 6 }}>{m.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TECH FOUNDATION */}
      <section style={{ padding: "100px 6%" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 20 }}>
              Built for real logistics constraints.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontSize: 15, color: "#4B4E58", maxWidth: 640, lineHeight: 1.6, marginBottom: 28 }}>
              Geographic clustering, capacity constraints, road-network routing, shared logistics coordination and return-load matching — engineered on infrastructure built for it.
            </p>
          </Reveal>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["React", "FastAPI", "Supabase", "PostGIS", "DBSCAN", "OR-Tools", "OSRM", "Leaflet"].map((t, i) => (
              <Reveal key={t} delay={0.2 + (i * 0.05)}>
                <span className="c-card-hover" style={{ fontSize: 12.5, fontFamily: mono, color: C.ink, border: `1px solid ${C.stone}`, padding: "8px 16px", borderRadius: 999, display: "inline-block", background: C.ivory }}>{t}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "90px 6%", background: C.ink, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div className="ambient-glow" style={{ position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)", width: 800, height: 800, background: "radial-gradient(circle, rgba(232, 84, 46, 0.08) 0%, rgba(23, 28, 43, 0) 70%)", pointerEvents: "none" }} />
        <Reveal>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: C.ivory, letterSpacing: "-0.02em", marginBottom: 28, position: "relative" }}>
            Ready to coordinate the network?
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, position: "relative" }}>
            <button className="c-btn-primary" onClick={() => navigate("/login")} style={{ background: C.coral, color: C.ivory, border: "none", padding: "14px 26px", borderRadius: 4, fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
              Open Business Portal
            </button>
            <button className="c-btn-secondary" onClick={() => navigate("/login")} style={{ background: "transparent", color: C.ivory, border: "1px solid rgba(250,246,239,0.3)", padding: "14px 26px", borderRadius: 4, fontSize: 14.5, fontWeight: 500, cursor: "pointer" }}>
              Admin Console
            </button>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "40px 6%", background: C.ink, borderTop: "1px solid rgba(250,246,239,0.08)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <img src="/src/assets/branding/CargoSync_name_tagline.png" alt="CargoSync" style={{ height: 20, objectFit: "contain" }} />
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {["Platform", "How it Works", "Optimization", "Impact", "Business Portal", "Admin Console"].map((t) => (
            <span key={t} style={{ color: "rgba(250,246,239,0.55)", fontSize: 12.5 }}>{t}</span>
          ))}
        </div>
        <span style={{ color: "rgba(250,246,239,0.4)", fontSize: 12 }}>© CargoSync AI</span>
      </footer>
    </div>
  );
}
