import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import {
  ArrowRight, MapPin, Package, Truck, Users, RefreshCw, TrendingDown,
  BarChart3, Search, Bell, ChevronDown, X, Play, CheckCircle2, Circle,
  Building2, ShieldCheck, Navigation, Route as RouteIcon, Gauge,
} from "lucide-react";

/* ============================================================
   FREIGHT FLOW — design tokens
   Midnight ink / warm ivory base, coral signature accent.
   ============================================================ */
const C = {
  ink: "#14171F",
  navy: "#1B2333",
  charcoal: "#2A2F3B",
  ivory: "#FAF6EF",
  cream: "#F3EEE3",
  stone: "#EDE7D9",
  coral: "#E8542E",
  coralDeep: "#C4401E",
  peach: "#F4C9AE",
  slate: "#8A8D96",
  emerald: "#1E8F6B",
  amber: "#C98A1B",
  red: "#C23B2E",
};

const font = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const mono = "'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace";

/* ============================================================
   DEMO DATA — deterministic Indore network
   ============================================================ */
const OPERATORS = [
  { id: "OP-01", name: "Malwa Express Logistics", orders: 42, vehicles: 6, utilization: 78 },
  { id: "OP-02", name: "Indore FreightWorks", orders: 31, vehicles: 4, utilization: 71 },
  { id: "OP-03", name: "Rajwada Cargo Movers", orders: 27, vehicles: 3, utilization: 64 },
  { id: "OP-04", name: "Vindhya Transit Co.", orders: 19, vehicles: 3, utilization: 58 },
];

const VEHICLES = [
  { id: "TRK-IND-01", operator: "OP-01", capacity: 1200, load: 940, stops: 7, distance: 41.3, util: 78, returnLoad: "Assigned" },
  { id: "TRK-IND-04", operator: "OP-01", capacity: 1200, load: 920, stops: 8, distance: 48.2, util: 77, returnLoad: "Assigned" },
  { id: "TRK-IND-09", operator: "OP-02", capacity: 900, load: 610, stops: 5, distance: 33.6, util: 68, returnLoad: "Pending" },
  { id: "TRK-IND-12", operator: "OP-03", capacity: 1500, load: 980, stops: 9, distance: 52.9, util: 65, returnLoad: "Assigned" },
];

const RETURN_LOADS = [
  { id: "RL-IND-006", from: "Pithampur", to: "Indore", weightKg: 240, capacityOk: true, timeOk: true, distanceOk: true, sharingOk: true, status: "CANDIDATE", reason: null },
  { id: "RL-IND-011", from: "Dewas", to: "Indore", weightKg: 310, capacityOk: true, timeOk: true, distanceOk: false, sharingOk: true, status: "REJECTED", reason: "Excessive detour" },
  { id: "RL-IND-014", from: "Mhow", to: "Indore", weightKg: 180, capacityOk: true, timeOk: true, distanceOk: true, sharingOk: true, status: "ASSIGNED", reason: null },
];

const IMPACT = [
  { name: "Baseline", distance: 612, cost: 38400 },
  { name: "CargoSync", distance: 471, cost: 27950 },
];
const UTIL_TREND = [
  { run: "R-01", util: 54 }, { run: "R-02", util: 59 }, { run: "R-03", util: 63 },
  { run: "R-04", util: 68 }, { run: "R-05", util: 74 }, { run: "R-06", util: 77 },
];
const RETURN_TREND = [
  { run: "R-01", loads: 2 }, { run: "R-02", loads: 3 }, { run: "R-03", loads: 3 },
  { run: "R-04", loads: 5 }, { run: "R-05", loads: 6 }, { run: "R-06", loads: 8 },
];

const ORDERS = [
  { id: "ORD-2291", operator: "Malwa Express", customer: "Anup Traders", pickup: "Rajendra Nagar", delivery: "Vijay Nagar", weight: 180, priority: "High", status: "In Transit", returnEligible: true },
  { id: "ORD-2292", operator: "Indore FreightWorks", customer: "Shree Textiles", pickup: "MG Road", delivery: "Palasia", weight: 95, priority: "Normal", status: "Delivered", returnEligible: false },
  { id: "ORD-2293", operator: "Rajwada Cargo", customer: "Omkar Traders", pickup: "Bhawarkuan", delivery: "Sudama Nagar", weight: 240, priority: "High", status: "Pending", returnEligible: true },
  { id: "ORD-2294", operator: "Vindhya Transit", customer: "Kailash Store", pickup: "Sanwer Road", delivery: "Pithampur", weight: 310, priority: "Normal", status: "In Transit", returnEligible: true },
  { id: "ORD-2295", operator: "Malwa Express", customer: "Devi Agencies", pickup: "Vijay Nagar", delivery: "Rau", weight: 128, priority: "Low", status: "Delivered", returnEligible: false },
];

const ROUTE_STOPS = [
  { id: "Depot", loadAfter: 920, x: 260, y: 200 },
  { id: "Stop 01", loadAfter: 780, x: 100, y: 90 },
  { id: "Stop 02", loadAfter: 620, x: 400, y: 70 },
  { id: "Stop 03", loadAfter: 430, x: 460, y: 220 },
  { id: "Delivery", loadAfter: 280, x: 340, y: 320 },
  { id: "Return Load", loadAfter: 520, x: 130, y: 300 },
  { id: "Depot", loadAfter: 520, x: 60, y: 200 },
];

const PIPELINE = [
  "Order Validation", "Coordinate Validation", "DBSCAN", "Cluster Validation",
  "Capacity", "Road Distance", "OR-Tools", "Return Load", "Baseline", "Savings",
];

/* Data-driven hero story: this structure mirrors the shape a real
   OptimizationResult would take, so the visualization can later
   render actual API output instead of demo data. */
const heroNetworkData = {
  depot: { id: "DEPOT", x: 70, y: 230, label: "Indore Depot" },
  orders: [
    { id: "o1", x: 150, y: 90, cluster: "A" },
    { id: "o2", x: 190, y: 60, cluster: "A" },
    { id: "o3", x: 170, y: 130, cluster: "A" },
    { id: "o4", x: 330, y: 110, cluster: "B" },
    { id: "o5", x: 360, y: 160, cluster: "B" },
    { id: "o6", x: 320, y: 190, cluster: "B" },
    { id: "o7", x: 250, y: 280, cluster: null }, // noise / outlier
  ],
  clusters: {
    A: { x: 170, y: 90, color: "coral" },
    B: { x: 335, y: 150, color: "navy" },
  },
  vehicle: { id: "TRK-IND-04", capacityKg: 1200 },
  route: { stops: ["A", "B"], loadAfterDelivery: 280 },
  returnLoad: { id: "RL-IND-006", from: "B", to: "DEPOT", weightKg: 240 },
};

/* ============================================================
   Shared bits
   ============================================================ */
function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, shown];
}

const Reveal = ({ children, delay = 0 }) => {
  const [ref, shown] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
    }}>{children}</div>
  );
};

/* ============================================================
   HERO NETWORK VISUAL (animated SVG)
   ============================================================ */
/* HERO_STAGES drives the whole hero animation off heroNetworkData —
   nothing below is a one-off DOM animation; every position is derived
   from the data object so a real OptimizationResult can drive this
   same component later. */
const HERO_STAGES = [
  { key: "orders", label: "Orders placed", dur: 1400 },
  { key: "dbscan", label: "DBSCAN clustering", dur: 1600 },
  { key: "capacity", label: "Vehicle capacity", dur: 1300 },
  { key: "route", label: "OR-Tools route", dur: 1700 },
  { key: "delivery", label: "Delivery in progress", dur: 1800 },
  { key: "returnload", label: "Return load matched", dur: 1600 },
  { key: "result", label: "Return load assigned", dur: 1600 },
];

function useHeroStage() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setI((v) => (v + 1) % HERO_STAGES.length), HERO_STAGES[i].dur);
    return () => clearTimeout(t);
  }, [i]);
  return HERO_STAGES[i].key;
}

function HeroNetwork() {
  const stage = useHeroStage();
  const { depot, orders, clusters, vehicle, route, returnLoad } = heroNetworkData;
  const stageIdx = HERO_STAGES.findIndex((s) => s.key === stage);

  // node position: sits at its own coordinate until "dbscan" stage or later,
  // then eases toward its cluster centroid.
  const grouped = stageIdx >= 1;
  const routeDrawn = stageIdx >= 3;
  const vehicleAtB = stageIdx >= 4;
  const showReturn = stageIdx >= 5;
  const returnHighlighted = stageIdx >= 6;

  const pathAB = `M${depot.x},${depot.y} L${clusters.A.x},${clusters.A.y} L${clusters.B.x},${clusters.B.y}`;
  const pathReturn = `M${clusters.B.x},${clusters.B.y} L${depot.x},${depot.y}`;
  const [truckPos, setTruckPos] = useState({ x: depot.x, y: depot.y });
  const abRef = useRef(null);
  const retRef = useRef(null);

  useEffect(() => {
    let raf; let start;
    const durOut = 1800, durRet = 1600;
    const animate = (ts) => {
      if (!start) start = ts;
      const el = ts - start;
      if (stage === "delivery" && abRef.current) {
        const len = abRef.current.getTotalLength();
        const p = abRef.current.getPointAtLength(Math.min(el / durOut, 1) * len);
        setTruckPos({ x: p.x, y: p.y });
        if (el < durOut) raf = requestAnimationFrame(animate);
      } else if ((stage === "returnload" || stage === "result") && retRef.current) {
        const len = retRef.current.getTotalLength();
        const p = retRef.current.getPointAtLength(Math.min(el / durRet, 1) * len);
        setTruckPos({ x: p.x, y: p.y });
        if (el < durRet) raf = requestAnimationFrame(animate);
      }
    };
    if (stage === "delivery" || stage === "returnload" || stage === "result") {
      raf = requestAnimationFrame(animate);
    } else if (stageIdx < 3) {
      setTruckPos({ x: depot.x, y: depot.y });
    } else if (stage === "route" || stage === "capacity") {
      setTruckPos({ x: depot.x, y: depot.y });
    }
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const remaining = vehicle.capacityKg - 920; // matches demo load below

  return (
    <div>
      <svg viewBox="0 0 420 320" style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <path ref={abRef} d={pathAB} fill="none" stroke="none" />
        <path ref={retRef} d={pathReturn} fill="none" stroke="none" />

        {/* route lines */}
        <path d={pathAB} fill="none" stroke={routeDrawn ? C.coral : C.stone} strokeWidth={routeDrawn ? 2 : 1.2}
          strokeDasharray={routeDrawn ? "0" : "4 5"} style={{ transition: "stroke 0.5s, stroke-width 0.5s" }} />
        {showReturn && (
          <path d={pathReturn} fill="none" stroke={returnHighlighted ? C.coral : C.slate} strokeWidth={returnHighlighted ? 2 : 1.2}
            strokeDasharray={returnHighlighted ? "0" : "3 5"} opacity={returnHighlighted ? 0.9 : 0.5} />
        )}

        {/* depot */}
        <circle cx={depot.x} cy={depot.y} r="7" fill={C.navy} />
        <text x={depot.x - 8} y={depot.y + 22} fontSize="9" fontFamily={mono} fill={C.slate}>DEPOT</text>

        {/* order nodes: ease toward cluster centroid once grouped */}
        {orders.map((o) => {
          const target = o.cluster ? clusters[o.cluster] : { x: o.x, y: o.y };
          const cx = grouped ? target.x + (o.x - target.x) * 0.15 : o.x;
          const cy = grouped ? target.y + (o.y - target.y) * 0.15 : o.y;
          const isNoise = !o.cluster;
          return (
            <circle key={o.id} cx={cx} cy={cy} r={isNoise ? 3 : 4}
              fill={isNoise ? "none" : grouped ? C.coral : C.ivory}
              stroke={isNoise ? C.slate : C.navy} strokeOpacity={isNoise ? 0.4 : 1} strokeWidth="1.2"
              style={{ transition: "cx 0.9s ease, cy 0.9s ease, fill 0.5s" }} />
          );
        })}

        {/* vehicle */}
        {stageIdx >= 2 && (
          <g style={{ transition: "transform 0.05s linear" }} transform={`translate(${truckPos.x},${truckPos.y})`}>
            <circle r="7" fill={C.coral} />
            <circle r="13" fill={C.coral} opacity="0.15" />
          </g>
        )}
      </svg>

      {/* status readout beneath the diagram — text mirrors the current stage */}
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: mono, fontSize: 11, color: "rgba(250,246,239,0.65)" }}>
        <span>{vehicle.id}</span>
        <span>
          {stage === "orders" && "7 orders placed"}
          {stage === "dbscan" && "2 clusters found · 1 outlier"}
          {stage === "capacity" && "920 / 1200 kg · 77%"}
          {stage === "route" && "Route generated via OR-Tools"}
          {stage === "delivery" && "Delivering to Cluster B"}
          {stage === "returnload" && `${returnLoad.id} · ${returnLoad.weightKg} kg compatible`}
          {stage === "result" && "RETURN LOAD ASSIGNED"}
        </span>
      </div>
      <div style={{ height: 3, background: "rgba(250,246,239,0.12)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
        <div style={{
          width: `${((stageIdx + 1) / HERO_STAGES.length) * 100}%`, height: "100%", background: C.coral,
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

/* ============================================================
   LANDING NAV
   ============================================================ */
function LandingNav({ onNav, scrolled }) {
  const items = ["Platform", "How it Works", "Optimization", "Impact"];
  return (
    <div style={{
      position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 50,
      width: "min(94%, 980px)", display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px 10px 20px", borderRadius: 999,
      background: scrolled ? "rgba(20,23,31,0.92)" : "rgba(20,23,31,0.72)",
      backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.08)",
      transition: "background 0.3s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => onNav("landing")}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Navigation size={13} color={C.ivory} strokeWidth={2.5} />
        </div>
        <span style={{ color: C.ivory, fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>CargoSync AI</span>
      </div>
      <div style={{ display: "flex", gap: 26 }}>
        {items.map((it) => (
          <span key={it} style={{ color: "rgba(250,246,239,0.72)", fontSize: 13.5, cursor: "pointer" }}>{it}</span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span onClick={() => onNav("login")} style={{ color: "rgba(250,246,239,0.7)", fontSize: 13, cursor: "pointer" }}>Business Portal</span>
        <span onClick={() => onNav("login")} style={{ color: "rgba(250,246,239,0.7)", fontSize: 13, cursor: "pointer" }}>Admin Console</span>
        <button onClick={() => onNav("login")} style={{
          background: C.coral, color: C.ivory, border: "none", borderRadius: 999,
          padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        }}>Enter Platform</button>
      </div>
    </div>
  );
}

/* ============================================================
   FEATURE CARD (varied minis)
   ============================================================ */
function FeatureCard({ n, title, text, mini }) {
  return (
    <Reveal>
      <div style={{
        background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 4, padding: "26px 24px",
        display: "flex", flexDirection: "column", gap: 14, height: "100%",
        transition: "transform 0.25s ease, border-color 0.25s ease",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = C.coral; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = C.stone; }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: mono, fontSize: 12, color: C.slate }}>{n}</span>
          <div>{mini}</div>
        </div>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: C.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>{title}</div>
          <div style={{ fontSize: 13.5, color: "#5B5E68", lineHeight: 1.55 }}>{text}</div>
        </div>
      </div>
    </Reveal>
  );
}

function ClusterMini() {
  const scattered = [{ x: 6, y: 4 }, { x: 20, y: 6 }, { x: 14, y: 20 }, { x: 30, y: 2 }, { x: 38, y: 14 }, { x: 34, y: 24 }];
  const grouped = [{ x: 10, y: 12 }, { x: 12, y: 10 }, { x: 11, y: 14 }, { x: 34, y: 10 }, { x: 34, y: 14 }, { x: 34, y: 12 }];
  const [on, setOn] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => setOn((v) => !v), 1600);
    return () => clearInterval(iv);
  }, []);
  const pts = on ? grouped : scattered;
  return (
    <svg width="46" height="30" viewBox="0 0 46 30">
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={i < 3 ? C.coral : C.navy} opacity={on ? 1 : 0.7}
          style={{ transition: "cx 0.9s ease, cy 0.9s ease" }} />
      ))}
    </svg>
  );
}
const RouteMini = () => (
  <svg width="46" height="30" viewBox="0 0 46 30"><path d="M4,24 L18,8 L32,20 L42,6" fill="none" stroke={C.coral} strokeWidth="2" /></svg>
);
const ReturnMini = () => (
  <svg width="46" height="30" viewBox="0 0 46 30">
    <path d="M4,10 L34,10" stroke={C.coral} strokeWidth="2" markerEnd="url(#a1)" />
    <path d="M34,22 L4,22" stroke={C.slate} strokeWidth="2" />
    <defs><marker id="a1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={C.coral} /></marker></defs>
  </svg>
);
const SavingsMini = () => (
  <svg width="46" height="30" viewBox="0 0 46 30"><rect x="6" y="6" width="8" height="22" fill={C.slate} opacity="0.4" /><rect x="20" y="14" width="8" height="14" fill={C.coral} /><rect x="34" y="18" width="8" height="10" fill={C.coral} opacity="0.7" /></svg>
);
const CapacityMini = () => (
  <svg width="46" height="30" viewBox="0 0 46 30"><rect x="4" y="4" width="38" height="22" rx="2" fill="none" stroke={C.slate} strokeWidth="1.5" /><rect x="6" y="14" width="34" height="10" fill={C.coral} opacity="0.75" /></svg>
);
const NetworkMini = () => (
  <svg width="46" height="30" viewBox="0 0 46 30"><circle cx="8" cy="8" r="2.5" fill={C.slate} /><circle cx="30" cy="6" r="2.5" fill={C.slate} /><circle cx="20" cy="22" r="2.5" fill={C.coral} /><circle cx="40" cy="20" r="2.5" fill={C.slate} /><path d="M8,8 L20,22 L30,6 M20,22 L40,20" stroke={C.slate} strokeWidth="1" opacity="0.5" /></svg>
);

/* ============================================================
   PROCESS STEP (interactive)
   ============================================================ */
const STAGES = [
  { k: "orders", label: "Orders", detail: "Operators submit delivery orders with pickup, delivery and cargo detail." },
  { k: "coords", label: "Coordinates", detail: "Addresses resolve to validated geographic coordinates." },
  { k: "dbscan", label: "DBSCAN", detail: "Groups geographically dense delivery requests into candidate clusters." },
  { k: "validate", label: "Cluster Validation", detail: "Checks geographic coherence, capacity and time-window feasibility." },
  { k: "capacity", label: "Capacity", detail: "Matches cluster demand against available vehicle capacity." },
  { k: "ortools", label: "OR-Tools", detail: "Generates a feasible constrained vehicle-routing solution." },
  { k: "return", label: "Return Load", detail: "Evaluates compatible reverse shipments against capacity, time, distance and sharing constraints." },
  { k: "savings", label: "Savings", detail: "Compares the result against independent baseline routing." },
];

function ProcessSection() {
  const [active, setActive] = useState("return");
  const stage = STAGES.find((s) => s.k === active);
  return (
    <div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {STAGES.map((s, i) => (
          <button key={s.k} onClick={() => setActive(s.k)} style={{
            flex: "0 0 auto", padding: "10px 14px", borderRadius: 999, cursor: "pointer",
            border: `1px solid ${active === s.k ? C.coral : C.stone}`,
            background: active === s.k ? C.coral : "transparent",
            color: active === s.k ? C.ivory : C.ink, fontSize: 12.5, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}>
            <span style={{ fontFamily: mono, fontSize: 10.5, opacity: 0.7 }}>{String(i + 1).padStart(2, "0")}</span>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 22, background: C.navy, borderRadius: 6, padding: "28px 30px", color: C.ivory, minHeight: 96 }}>
        <div style={{ fontSize: 12, fontFamily: mono, color: C.peach, marginBottom: 8 }}>{stage.label.toUpperCase()}</div>
        <div style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 560, color: "rgba(250,246,239,0.88)" }}>{stage.detail}</div>
      </div>
    </div>
  );
}

function BeforeAfterToggle() {
  const [after, setAfter] = useState(false);
  const opColors = { A: C.slate, B: "#A9ACB4", C: "#C7C9CE" };
  return (
    <div>
      <div style={{ display: "inline-flex", border: `1px solid ${C.stone}`, borderRadius: 999, padding: 3, marginBottom: 22 }}>
        {["Before", "After"].map((l, i) => (
          <button key={l} onClick={() => setAfter(i === 1)} style={{
            border: "none", borderRadius: 999, padding: "8px 18px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            background: (i === 1) === after ? C.ink : "transparent", color: (i === 1) === after ? C.ivory : C.slate,
          }}>{l}</button>
        ))}
      </div>
      <div style={{ background: after ? C.navy : C.cream, borderRadius: 6, padding: "34px 30px", transition: "background 0.5s ease", minHeight: 220 }}>
        {!after ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {["Operator A", "Operator B", "Operator C"].map((name, i) => (
              <div key={name} style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 4, padding: "16px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{name}</div>
                <svg width="100%" height="46" viewBox="0 0 140 46">
                  <path d={`M8,${36 - i * 4} L70,${10 + i * 6} L132,${30 - i * 3}`} fill="none" stroke={C.slate} strokeWidth="2" strokeDasharray="5 4" />
                </svg>
                <div style={{ fontSize: 11.5, color: C.slate, marginTop: 6 }}>Independent route · empty return</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ color: C.ivory, fontSize: 13.5, fontWeight: 600 }}>CargoSync — one coordinated network</div>
            <svg width="100%" height="120" viewBox="0 0 640 120">
              <circle cx="40" cy="60" r="7" fill={C.coral} />
              {[{ x: 210, y: 30 }, { x: 340, y: 70 }, { x: 470, y: 40 }, { x: 560, y: 90 }].map((p, i) => (
                <g key={i}>
                  <line x1="40" y1="60" x2={p.x} y2={p.y} stroke={C.coral} strokeWidth="1.6" opacity="0.5" />
                  <circle cx={p.x} cy={p.y} r="5" fill={C.peach} />
                </g>
              ))}
              <line x1="560" y1="90" x2="40" y2="60" stroke={C.coral} strokeWidth="1.6" strokeDasharray="4 4" opacity="0.8" />
            </svg>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              {["Demand consolidated", "Capacity shared", "Return leg filled"].map((t) => (
                <span key={t} style={{ fontSize: 12, fontFamily: mono, color: C.peach }}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   RETURN LOAD SHOWCASE
   ============================================================ */
function ReturnShowcase() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, alignItems: "center" }}>
      <div>
        <div style={{ fontFamily: mono, fontSize: 12, color: C.coral, marginBottom: 12 }}>TRK-IND-04 · INDORE → PITHAMPUR</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { label: "Delivery completed", sub: "Cargo dropped at destination" },
            { label: "Remaining capacity", sub: "280 kg available on return leg" },
            { label: "Compatible shipment found", sub: "RL-IND-006 · Pithampur → Indore" },
            { label: "Return load assigned", sub: "Capacity, time, distance and sharing all satisfied" },
          ].map((row, i, arr) => (
            <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < arr.length - 1 ? 20 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: i === 3 ? C.coral : C.navy, flexShrink: 0 }} />
                {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: C.stone, minHeight: 22 }} />}
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>{row.label}</div>
                <div style={{ fontSize: 13, color: C.slate }}>{row.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: C.cream, borderRadius: 6, padding: "18px 20px", border: `1px solid ${C.stone}` }}>
          <div style={{ fontSize: 11, fontFamily: mono, color: C.slate, marginBottom: 6 }}>EMPTY RETURN</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>36.4 km wasted</div>
          <div style={{ fontSize: 13, color: C.slate }}>Vehicle returns to depot with no cargo</div>
        </div>
        <div style={{ background: C.navy, borderRadius: 6, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, fontFamily: mono, color: C.peach, marginBottom: 6 }}>CARGOSYNC RETURN LOAD</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.ivory }}>+280 kg recovered</div>
          <div style={{ fontSize: 13, color: "rgba(250,246,239,0.7)" }}>Reverse leg monetized, empty km eliminated</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LANDING PAGE
   ============================================================ */
function Landing({ onNav }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <div style={{ background: C.ivory, fontFamily: font, color: C.ink }}>
      <LandingNav onNav={onNav} scrolled={scrolled} />

      {/* HERO */}
      <section style={{ padding: "150px 6% 90px", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: mono, color: C.slate, marginBottom: 22, border: `1px solid ${C.stone}`, padding: "5px 10px", borderRadius: 999 }}>
              <MapPin size={12} color={C.coral} /> INDORE NETWORK · MADHYA PRADESH
            </div>
            <h1 style={{ fontSize: "clamp(38px, 5vw, 62px)", fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.02em", margin: 0 }}>
              Move cargo.<br />Not empty miles.
            </h1>
            <p style={{ fontSize: 17, color: "#4B4E58", maxWidth: 460, marginTop: 22, lineHeight: 1.6 }}>
              CargoSync coordinates shared logistics capacity across multiple operators, optimizes delivery routes, and matches compatible return shipments.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
              <button onClick={() => onNav("login")} style={{ background: C.ink, color: C.ivory, border: "none", padding: "14px 24px", borderRadius: 4, fontSize: 14.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                Explore the platform <ArrowRight size={15} />
              </button>
              <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "transparent", color: C.ink, border: `1px solid ${C.stone}`, padding: "14px 24px", borderRadius: 4, fontSize: 14.5, fontWeight: 500, cursor: "pointer" }}>
                See how it works
              </button>
            </div>
            <div style={{ display: "flex", gap: 26, marginTop: 46 }}>
              {["Shared Capacity", "Route Optimization", "Return-Load Matching"].map((t) => (
                <div key={t} style={{ fontSize: 12.5, color: C.slate, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.coral }} /> {t}
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: C.navy, borderRadius: 10, padding: 22 }}>
            <HeroNetwork />
          </div>
        </div>
      </section>

      {/* PROBLEM -> SOLUTION: interactive before/after */}
      <section style={{ padding: "60px 6%", maxWidth: 1240, margin: "0 auto" }}>
        <Reveal>
          <h2 style={{ fontSize: "clamp(26px,3vw,36px)", fontWeight: 700, letterSpacing: "-0.01em", maxWidth: 640, marginBottom: 30 }}>
            Logistics is a network problem.
          </h2>
        </Reveal>
        <BeforeAfterToggle />
      </section>

      {/* FEATURES */}
      <section style={{ padding: "40px 6% 90px", maxWidth: 1240, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(26px,3vw,36px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 34 }}>
          One network. Multiple advantages.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          <FeatureCard n="01" title="Shared Capacity" text="Coordinate delivery demand across multiple operators instead of routing in isolation." mini={<NetworkMini />} />
          <FeatureCard n="02" title="Geographic Clustering" text="DBSCAN groups geographically dense delivery requests into feasible service pockets." mini={<ClusterMini />} />
          <FeatureCard n="03" title="Constrained Routing" text="OR-Tools generates a feasible route considering vehicle capacity and configured constraints." mini={<RouteMini />} />
          <FeatureCard n="04" title="Return-Load Matching" text="Finds compatible cargo for the return journey, turning empty miles into revenue." mini={<ReturnMini />} />
          <FeatureCard n="05" title="Measurable Savings" text="Compares baseline independent routing against CargoSync's coordinated result." mini={<SavingsMini />} />
          <FeatureCard n="06" title="Network Visibility" text="Visualize routes, vehicles and operational impact across the entire network." mini={<CapacityMini />} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "40px 6% 90px", maxWidth: 1240, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(26px,3vw,36px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 30 }}>
          How CargoSync works.
        </h2>
        <ProcessSection />
      </section>

      {/* RETURN LOAD SHOWCASE */}
      <section style={{ padding: "40px 6% 100px", maxWidth: 1240, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(26px,3vw,36px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 34 }}>
          The return journey matters.
        </h2>
        <ReturnShowcase />
      </section>

      {/* IMPACT */}
      <section style={{ padding: "40px 6% 100px", background: C.cream }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(26px,3vw,36px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 8 }}>
            From routes to results.
          </h2>
          <div style={{ fontSize: 12, fontFamily: mono, color: C.slate, marginBottom: 30 }}>DEMO SCENARIO · ILLUSTRATIVE VALUES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
            {[
              { l: "Distance", v: "-23%" }, { l: "Cost", v: "-27%" }, { l: "Utilization", v: "77%" },
              { l: "Empty Returns", v: "-61%" }, { l: "Return Loads", v: "8" }, { l: "Est. CO₂", v: "-18%" },
            ].map((m) => (
              <div key={m.l} style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 4, padding: "18px 14px" }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{m.v}</div>
                <div style={{ fontSize: 11.5, color: C.slate, marginTop: 4 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH FOUNDATION */}
      <section style={{ padding: "70px 6%", maxWidth: 1240, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 18 }}>
          Built for real logistics constraints.
        </h2>
        <p style={{ fontSize: 14.5, color: "#4B4E58", maxWidth: 620, lineHeight: 1.6, marginBottom: 22 }}>
          Geographic clustering, capacity constraints, road-network routing, shared logistics coordination and return-load matching — engineered on infrastructure built for it.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["React", "FastAPI", "Supabase", "PostGIS", "DBSCAN", "OR-Tools", "OSRM", "Leaflet"].map((t) => (
            <span key={t} style={{ fontSize: 12, fontFamily: mono, color: C.ink, border: `1px solid ${C.stone}`, padding: "6px 12px", borderRadius: 999 }}>{t}</span>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "90px 6%", background: C.ink, textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: C.ivory, letterSpacing: "-0.02em", marginBottom: 28 }}>
          Ready to coordinate the network?
        </h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
          <button onClick={() => onNav("login")} style={{ background: C.coral, color: C.ivory, border: "none", padding: "14px 26px", borderRadius: 4, fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
            Open Business Portal
          </button>
          <button onClick={() => onNav("login")} style={{ background: "transparent", color: C.ivory, border: "1px solid rgba(250,246,239,0.3)", padding: "14px 26px", borderRadius: 4, fontSize: 14.5, fontWeight: 500, cursor: "pointer" }}>
            Admin Console
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "40px 6%", background: C.ink, borderTop: "1px solid rgba(250,246,239,0.08)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <span style={{ color: C.ivory, fontSize: 13.5, fontWeight: 600 }}>CargoSync AI</span>
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

/* ============================================================
   LOGIN — role selection + business/admin forms
   ============================================================ */
function Login({ onNav, onEnter }) {
  const [mode, setMode] = useState("select"); // select | business | admin

  if (mode === "select") {
    return (
      <div style={{ minHeight: "100vh", background: C.ivory, fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div onClick={() => onNav("landing")} style={{ fontSize: 14, fontWeight: 600, color: C.ink, cursor: "pointer", marginBottom: 18 }}>← CargoSync AI</div>
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
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 26 }}>Sign in to continue.</div>
        <label style={{ fontSize: 12, color: C.slate, marginBottom: 6 }}>Email</label>
        <input defaultValue={isBiz ? "ops@malwaexpress.in" : "admin@cargosync.ai"} style={{ padding: "11px 14px", borderRadius: 4, border: `1px solid ${C.stone}`, marginBottom: 16, fontSize: 14 }} />
        <label style={{ fontSize: 12, color: C.slate, marginBottom: 6 }}>Password</label>
        <input type="password" defaultValue="••••••••" style={{ padding: "11px 14px", borderRadius: 4, border: `1px solid ${C.stone}`, marginBottom: 22, fontSize: 14 }} />
        <button onClick={() => onEnter(isBiz ? "operator" : "admin")} style={{
          background: isBiz ? C.coral : C.ink, color: C.ivory, border: "none", padding: "13px", borderRadius: 4,
          fontSize: 14.5, fontWeight: 600, cursor: "pointer",
        }}>
          {isBiz ? "Sign in to Business Portal" : "Sign in to Admin Console"}
        </button>
        <div style={{ fontSize: 12, color: C.slate, marginTop: 14, textAlign: "center" }}>Forgot password?</div>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, desc, features, cta, onClick, accent }) {
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
        {features.map((f) => (
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

function RoleMicroBusiness({ animate }) {
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
function RoleMicroAdmin({ animate }) {
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

/* ============================================================
   APP SHELL
   ============================================================ */
function TopNav({ page, setPage, role, onLogout }) {
  const [menu, setMenu] = useState(false);
  const items = ["Overview", "Orders", "Fleet", "Network", "Optimize", "Routes", "Impact"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 26px", borderBottom: `1px solid ${C.stone}`, background: C.ivory, position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Navigation size={11} color={C.ivory} strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>CargoSync</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {items.map((it) => (
            <button key={it} onClick={() => setPage(it.toLowerCase())} style={{
              background: page === it.toLowerCase() ? C.stone : "transparent", border: "none",
              padding: "7px 13px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer",
              color: page === it.toLowerCase() ? C.ink : "#5B5E68",
            }}>{it}</button>
          ))}
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
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.navy, color: C.ivory, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>PR</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1 }}>Prince</div>
              <div style={{ fontSize: 10, color: C.slate, lineHeight: 1.1 }}>{role === "admin" ? "Admin" : "Operator"}</div>
            </div>
            <ChevronDown size={13} color={C.slate} />
          </div>
          {menu && (
            <div style={{ position: "absolute", right: 0, top: 42, background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, width: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              {["Profile", "Settings", "Workspace"].map((m) => (
                <div key={m} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>{m}</div>
              ))}
              <div onClick={onLogout} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", color: C.red, borderTop: `1px solid ${C.stone}` }}>Sign out</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: C.slate, fontWeight: 500 }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent ? C.coral : C.ink, fontFamily: mono }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.slate }}>{sub}</div>}
    </div>
  );
}

/* Simulated network map (SVG, Leaflet-ready structure) */
function NetworkMap({ compact }) {
  const depot = { x: 260, y: 200 };
  const stops = [
    { x: 100, y: 90, active: true }, { x: 400, y: 70 }, { x: 460, y: 220, active: true },
    { x: 340, y: 320 }, { x: 130, y: 300 }, { x: 60, y: 200 },
  ];
  return (
    <svg viewBox="0 0 520 380" style={{ width: "100%", height: compact ? 260 : 420, background: C.cream, borderRadius: 6 }}>
      <rect x="0" y="0" width="520" height="380" fill={C.cream} rx="6" />
      {stops.map((s, i) => (
        <line key={i} x1={depot.x} y1={depot.y} x2={s.x} y2={s.y} stroke={s.active ? C.coral : C.stone} strokeWidth={s.active ? 2 : 1} strokeDasharray={s.active ? "0" : "4 4"} />
      ))}
      <circle cx={depot.x} cy={depot.y} r="8" fill={C.navy} />
      <text x={depot.x + 12} y={depot.y + 4} fontSize="10" fontFamily={mono} fill={C.navy}>DEPOT</text>
      {stops.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r="5.5" fill={s.active ? C.coral : C.ivory} stroke={C.slate} strokeWidth="1" />
      ))}
      <circle cx="330" cy="140" r="4" fill={C.emerald}>
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function Dashboard({ role }) {
  const [returnLoads, setReturnLoads] = useState(RETURN_LOADS);
  const onAssign = (id) => setReturnLoads((prev) => prev.map((r) => r.id === id ? { ...r, status: "ASSIGNED" } : r));
  const isAdmin = role === "admin";
  return (
    <div style={{ padding: 26, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
      <div>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{isAdmin ? "Network Overview" : "My Operations"}</div>
            <div style={{ fontSize: 13, color: C.slate }}>{isAdmin ? "Cargo movement across the full Indore network." : "Malwa Express Logistics · Indore network."}</div>
          </div>
          <span style={{ fontSize: 10.5, fontFamily: mono, color: C.slate, border: `1px solid ${C.stone}`, padding: "3px 8px", borderRadius: 999 }}>DEMO DATA</span>
        </div>
        <NetworkMap />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 16 }}>
          <MetricCard icon={<Package size={14} color={C.slate} />} label="Orders" value="119" sub="4 operators" />
          <MetricCard icon={<Truck size={14} color={C.slate} />} label="Vehicles" value="16" sub="active" />
          <MetricCard icon={<Gauge size={14} color={C.slate} />} label="Avg Utilization" value="72%" sub="+6% vs baseline" />
          <MetricCard icon={<TrendingDown size={14} color={C.coral} />} label="Distance Saved" value="141 km" accent />
          <MetricCard icon={<RefreshCw size={14} color={C.slate} />} label="Return Loads" value="8" sub="2 pending" />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel title="Optimization Status">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PIPELINE.slice(0, 6).map((p, i) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: i < 5 ? C.ink : C.slate }}>
                {i < 5 ? <CheckCircle2 size={13} color={C.emerald} /> : <Circle size={13} color={C.stone} />} {p}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Return-Load Opportunities">
          {returnLoads.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.stone}`, fontSize: 12.5 }}>
              <div>
                <div style={{ fontFamily: mono }}>{r.id}</div>
                {r.reason && <div style={{ fontSize: 10.5, color: C.slate }}>{r.reason}</div>}
              </div>
              {r.status === "CANDIDATE" ? (
                <button onClick={() => onAssign(r.id)} style={{ background: C.coral, color: C.ivory, border: "none", borderRadius: 4, padding: "4px 9px", fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>Assign</button>
              ) : <StatusBadge status={r.status} />}
            </div>
          ))}
        </Panel>
        <Panel title="Operators">
          {OPERATORS.map((o) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12.5 }}>
              <span>{o.name}</span><span style={{ color: C.slate }}>{o.utilization}%</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: C.ink }}>{title}</div>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    ASSIGNED: { bg: "rgba(30,143,107,0.12)", c: C.emerald },
    REJECTED: { bg: "rgba(194,59,46,0.1)", c: C.red },
    PENDING: { bg: "rgba(201,138,27,0.12)", c: C.amber },
    "In Transit": { bg: "rgba(201,138,27,0.12)", c: C.amber },
    Delivered: { bg: "rgba(30,143,107,0.12)", c: C.emerald },
    Pending: { bg: "rgba(138,141,150,0.14)", c: C.slate },
  };
  const s = map[status] || { bg: C.stone, c: C.slate };
  return <span style={{ fontSize: 10.5, fontWeight: 600, background: s.bg, color: s.c, padding: "3px 8px", borderRadius: 999 }}>{status}</span>;
}

function OrdersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [returnOnly, setReturnOnly] = useState(false);
  const [selected, setSelected] = useState(null);

  const filtered = ORDERS.filter((o) => {
    if (q && !(`${o.id} ${o.customer} ${o.operator}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (status !== "All" && o.status !== status) return false;
    if (priority !== "All" && o.priority !== priority) return false;
    if (returnOnly && !o.returnEligible) return false;
    return true;
  });

  const selectStyle = { padding: "7px 10px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 12.5, background: C.ivory };

  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Orders</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 16 }}>{filtered.length} of {ORDERS.length} orders shown.</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="Search order, customer, operator" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ ...selectStyle, flex: "1 1 220px", minWidth: 200 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
          {["All", "Pending", "In Transit", "Delivered"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={selectStyle}>
          {["All", "High", "Normal", "Low"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.slate, cursor: "pointer" }}>
          <input type="checkbox" checked={returnOnly} onChange={(e) => setReturnOnly(e.target.checked)} />
          Return eligible only
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap: 16 }}>
        <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: C.slate }}>No orders match the current filters.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: C.cream, textAlign: "left" }}>
                  {["Order ID", "Operator", "Customer", "Pickup", "Delivery", "Weight", "Priority", "Status", "Return"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontWeight: 600, color: C.slate, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} onClick={() => setSelected(o)} style={{ borderTop: `1px solid ${C.stone}`, cursor: "pointer", background: selected?.id === o.id ? C.cream : "transparent" }}>
                    <td style={{ padding: "10px 14px", fontFamily: mono }}>{o.id}</td>
                    <td style={{ padding: "10px 14px" }}>{o.operator}</td>
                    <td style={{ padding: "10px 14px" }}>{o.customer}</td>
                    <td style={{ padding: "10px 14px" }}>{o.pickup}</td>
                    <td style={{ padding: "10px 14px" }}>{o.delivery}</td>
                    <td style={{ padding: "10px 14px" }}>{o.weight} kg</td>
                    <td style={{ padding: "10px 14px" }}>{o.priority}</td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={o.status} /></td>
                    <td style={{ padding: "10px 14px" }}>{o.returnEligible ? "Yes" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {selected && (
          <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 14 }}>{selected.id}</div>
              <X size={15} style={{ cursor: "pointer" }} onClick={() => setSelected(null)} />
            </div>
            <div style={{ fontSize: 12.5, color: C.slate, marginTop: 4 }}>{selected.customer} · {selected.operator}</div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
              <Row l="Pickup" v={selected.pickup} />
              <Row l="Delivery" v={selected.delivery} />
              <Row l="Weight" v={`${selected.weight} kg`} />
              <Row l="Priority" v={selected.priority} />
              <Row l="Return eligible" v={selected.returnEligible ? "Yes" : "No"} />
            </div>
            <button style={{ marginTop: 14, width: "100%", background: C.ink, color: C.ivory, border: "none", padding: "9px", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              View on map
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FleetPage() {
  const [sel, setSel] = useState(VEHICLES[0]);
  return (
    <div style={{ padding: 26, display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Fleet</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {VEHICLES.map((v) => (
            <div key={v.id} onClick={() => setSel(v)} style={{
              padding: "12px 14px", borderRadius: 6, cursor: "pointer",
              border: `1px solid ${sel.id === v.id ? C.coral : C.stone}`, background: C.ivory,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600 }}>{v.id}</span>
                <span style={{ fontSize: 11.5, color: C.slate }}>{v.operator}</span>
              </div>
              <div style={{ marginTop: 8, height: 5, borderRadius: 3, background: C.stone }}>
                <div style={{ width: `${v.util}%`, height: "100%", borderRadius: 3, background: C.coral }} />
              </div>
              <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>{v.load} / {v.capacity} kg · {v.util}%</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 22 }}>
        <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{sel.id}</div>
        <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 18 }}>{sel.operator} · {sel.stops} stops · {sel.distance} km</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <MetricCard label="Current Load" value={`${sel.load} kg`} />
          <MetricCard label="Utilization" value={`${sel.util}%`} accent />
          <MetricCard label="Distance" value={`${sel.distance} km`} />
          <MetricCard label="Return Load" value={sel.returnLoad} />
        </div>
      </div>
    </div>
  );
}

function NetworkPage() {
  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Operators</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 18 }}>Multi-operator coordination across the Indore network.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {OPERATORS.map((o) => (
          <div key={o.id} style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>{o.name}</div>
            <div style={{ fontSize: 12, color: C.slate, marginBottom: 3 }}>{o.orders} orders · {o.vehicles} vehicles</div>
            <div style={{ height: 5, borderRadius: 3, background: C.stone, marginTop: 10 }}>
              <div style={{ width: `${o.utilization}%`, height: "100%", borderRadius: 3, background: C.coral }} />
            </div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>{o.utilization}% utilization</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OptimizePage() {
  const [running, setRunning] = useState(false);
  const [stageIdx, setStageIdx] = useState(-1);
  const [done, setDone] = useState(false);

  const run = () => {
    setRunning(true); setDone(false); setStageIdx(0);
  };
  useEffect(() => {
    if (!running) return;
    if (stageIdx >= PIPELINE.length) { setRunning(false); setDone(true); return; }
    const t = setTimeout(() => setStageIdx((i) => i + 1), 380);
    return () => clearTimeout(t);
  }, [running, stageIdx]);

  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Optimize</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>Build a scenario and run the constrained optimization engine.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel title="Scenario">
          <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 10 }}>4 operators · 119 orders · 16 vehicles selected</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {["Capacity constraints", "Time windows", "Return-load matching"].map((f) => (
              <span key={f} style={{ fontSize: 11.5, fontFamily: mono, border: `1px solid ${C.stone}`, padding: "5px 10px", borderRadius: 999 }}>{f}</span>
            ))}
          </div>
          <button onClick={run} disabled={running} style={{ background: C.coral, color: C.ivory, border: "none", padding: "11px 20px", borderRadius: 4, fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: running ? 0.6 : 1 }}>
            {running ? "Running..." : "Run Optimization"}
          </button>
        </Panel>
        <Panel title="Pipeline">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PIPELINE.map((p, i) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: i <= stageIdx ? C.ink : C.slate, transition: "color 0.3s" }}>
                {i < stageIdx || done ? <CheckCircle2 size={13} color={C.emerald} /> : i === stageIdx ? <RefreshCw size={13} color={C.coral} className="spin" /> : <Circle size={13} color={C.stone} />}
                {p}
              </div>
            ))}
          </div>
        </Panel>
      </div>
      {done && (
        <div style={{ marginTop: 24 }}>
          <ResultComparison />
        </div>
      )}
    </div>
  );
}

function ResultComparison() {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Optimization Result · RUN-2026-0906</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: C.cream, borderRadius: 6, padding: 18, border: `1px solid ${C.stone}` }}>
          <div style={{ fontSize: 11, fontFamily: mono, color: C.slate, marginBottom: 10 }}>BASELINE</div>
          <Row l="Total Distance" v="612 km" />
          <Row l="Vehicles Used" v="19" />
          <Row l="Avg Utilization" v="54%" />
          <Row l="Empty Return KM" v="94 km" />
          <Row l="Cost" v="₹38,400" />
        </div>
        <div style={{ background: C.navy, borderRadius: 6, padding: 18 }}>
          <div style={{ fontSize: 11, fontFamily: mono, color: C.peach, marginBottom: 10 }}>CARGOSYNC</div>
          <Row l="Total Distance" v="471 km" light coral />
          <Row l="Vehicles Used" v="16" light />
          <Row l="Avg Utilization" v="77%" light coral />
          <Row l="Empty Return KM" v="37 km" light coral />
          <Row l="Cost" v="₹27,950" light coral />
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <ReturnShowcase />
      </div>
    </div>
  );
}

function Row({ l, v, light, coral }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: light ? "rgba(250,246,239,0.85)" : "#3A3D45" }}>
      <span>{l}</span><span style={{ fontWeight: 700, color: coral ? C.coral : light ? C.ivory : C.ink, fontFamily: mono }}>{v}</span>
    </div>
  );
}

function RoutesPage() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;
    if (idx >= ROUTE_STOPS.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setIdx((v) => v + 1), 900 / speed);
    return () => clearTimeout(t);
  }, [playing, idx, speed]);

  const current = ROUTE_STOPS[idx];
  const capacity = 1200;

  return (
    <div style={{ padding: 26, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Route Intelligence</div>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 14 }}>TRK-IND-04 · Malwa Express Logistics</div>
        <svg viewBox="0 0 520 380" style={{ width: "100%", height: 340, background: C.cream, borderRadius: 6 }}>
          <path d={`M${ROUTE_STOPS.map((s) => `${s.x},${s.y}`).join(" L")}`} fill="none" stroke={C.stone} strokeWidth="2" />
          <path d={`M${ROUTE_STOPS.slice(0, idx + 1).map((s) => `${s.x},${s.y}`).join(" L")}`} fill="none" stroke={C.coral} strokeWidth="2.5" />
          {ROUTE_STOPS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={i === idx ? 8 : 5} fill={i <= idx ? C.coral : C.ivory} stroke={C.navy} strokeWidth="1.2" />
          ))}
        </svg>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
          <button onClick={() => setPlaying(!playing)} style={{ background: C.ink, color: C.ivory, border: "none", padding: "10px 18px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <Play size={13} /> {playing ? "Pause" : idx > 0 ? "Resume" : "Play Route"}
          </button>
          <button onClick={() => { setIdx(0); setPlaying(false); }} style={{ background: "transparent", border: `1px solid ${C.stone}`, padding: "10px 14px", borderRadius: 4, fontSize: 13, cursor: "pointer" }}>Restart</button>
          {[1, 2, 4].map((s) => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              border: `1px solid ${speed === s ? C.coral : C.stone}`, background: speed === s ? C.coral : "transparent",
              color: speed === s ? C.ivory : C.ink, borderRadius: 4, padding: "8px 12px", fontSize: 12, cursor: "pointer",
            }}>{s}×</button>
          ))}
        </div>
      </div>
      <div>
        <Panel title="Route Timeline">
          {ROUTE_STOPS.map((s, i, arr) => (
            <div key={i} style={{ display: "flex", gap: 10, paddingBottom: i < arr.length - 1 ? 10 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: i === idx ? C.coral : i < idx ? C.navy : C.stone }} />
                {i < arr.length - 1 && <div style={{ width: 1, height: 16, background: C.stone }} />}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: i === idx ? 600 : 400, color: s.id === "Return Load" ? C.coral : C.ink }}>{s.id}</span>
            </div>
          ))}
        </Panel>
        <div style={{ marginTop: 14 }}>
          <Panel title="Live Vehicle State">
            <Row l="Current stop" v={current.id} />
            <Row l="Load" v={`${current.loadAfter} / ${capacity} kg`} />
            <Row l="Utilization" v={`${Math.round((current.loadAfter / capacity) * 100)}%`} />
            <Row l="ETA next stop" v={idx < ROUTE_STOPS.length - 1 ? `${(idx + 1) * 6} min` : "Arrived"} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ImpactPage() {
  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Impact</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>Aggregate results across all optimization runs.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        <Panel title="Before vs After — Distance (km)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={IMPACT}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Bar dataKey="distance" fill={C.coral} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Before vs After — Cost (₹)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={IMPACT}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Bar dataKey="cost" fill={C.navy} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Utilization Trend">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={UTIL_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="run" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Line type="monotone" dataKey="util" stroke={C.coral} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Return Load Activity">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={RETURN_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="run" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Area type="monotone" dataKey="loads" stroke={C.navy} fill={C.peach} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   APP ROOT
   ============================================================ */
export default function CargoSyncPrototype() {
  const [view, setView] = useState("landing"); // landing | login | app
  const [role, setRole] = useState("operator");
  const [page, setPage] = useState("overview");

  const pages = {
    overview: <Dashboard role={role} />,
    orders: <OrdersPage />,
    fleet: <FleetPage />,
    network: <NetworkPage />,
    optimize: <OptimizePage />,
    routes: <RoutesPage />,
    impact: <ImpactPage />,
  };

  if (view === "landing") return <Landing onNav={setView} />;
  if (view === "login") return <Login onNav={setView} onEnter={(r) => { setRole(r); setView("app"); }} />;

  return (
    <div style={{ fontFamily: font, background: C.stone, minHeight: "100vh" }}>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <TopNav page={page} setPage={setPage} role={role} onLogout={() => setView("landing")} />
      {pages[page]}
    </div>
  );
}
