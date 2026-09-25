import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { Truck, Settings, Play, Pause, RotateCcw, AlertCircle, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";

import { useMobile } from "../hooks/useMobile";
import { C, mono } from "../data/prototype/designTokens";

import type { OptimizationRunResponse } from "../types/api";
import L from "leaflet";

// ─── Stop-type colors ────────────────────────────────────────────
const STOP_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  DEPOT:           { fill: C.navy,    stroke: C.navy,    label: "Depot" },
  ORDER:           { fill: C.coral,   stroke: "#B83F1F", label: "Delivery" },
  RETURN_PICKUP:   { fill: C.emerald, stroke: "#1B7A4A", label: "Return Pickup" },
  RETURN_DELIVERY: { fill: "#8B5CF6", stroke: "#6D28D9", label: "Return Delivery" },
};

function getStopColor(stop: any, index: number, total: number) {
  if (stop.stop_type === "DEPOT_START" || stop.stop_type === "DEPOT_END") return STOP_COLORS.DEPOT;
  if (stop.stop_type && STOP_COLORS[stop.stop_type]) return STOP_COLORS[stop.stop_type];
  if (index === 0 || index === total - 1) return STOP_COLORS.DEPOT;
  return STOP_COLORS.ORDER;
}

// ─── Geometry helpers ────────────────────────────────────────────
function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function buildCumulativeDistances(pts: [number, number][]): number[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + haversineMeters(pts[i - 1], pts[i]));
  }
  return cum;
}

function interpolateAlongRoute(pts: [number, number][], cum: number[], distAlongRoute: number): [number, number] {
  if (distAlongRoute <= 0) return pts[0];
  const total = cum[cum.length - 1];
  if (distAlongRoute >= total) return pts[pts.length - 1];
  let lo = 0, hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= distAlongRoute) lo = mid; else hi = mid;
  }
  const segLen = cum[hi] - cum[lo];
  const t = segLen > 0 ? (distAlongRoute - cum[lo]) / segLen : 0;
  return [
    pts[lo][0] + t * (pts[hi][0] - pts[lo][0]),
    pts[lo][1] + t * (pts[hi][1] - pts[lo][1]),
  ];
}

// ─── Duration formatter ──────────────────────────────────────────
function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// ─── FitBounds helper ────────────────────────────────────────────
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions.map(p => L.latLng(p[0], p[1]))), { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

// ─── Vehicle animation marker ──────────────────────────────
function VehicleMarker({ positions, cumDist, progress }: { positions: [number, number][]; cumDist: number[]; progress: number }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const icon = L.divIcon({
      html: `<div style="background:${C.ink};width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid ${C.ivory};box-shadow:0 2px 8px rgba(0,0,0,0.35)">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${C.ivory}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
             </div>`,
      className: "",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    const pos = positions[0] || [22.7196, 75.8577];
    const m = L.marker(pos, { icon, zIndexOffset: 1000 }).addTo(map);
    markerRef.current = m;
    return () => { m.remove(); markerRef.current = null; };
  }, [map, positions]);

  useEffect(() => {
    if (!markerRef.current || positions.length < 2) return;
    const d = progress * cumDist[cumDist.length - 1];
    markerRef.current.setLatLng(interpolateAlongRoute(positions, cumDist, d));
  }, [progress, positions, cumDist]);

  return null;
}

// ─── Main RoutesPage ─────────────────────────────────────────────
type PlayState = "idle" | "playing" | "paused" | "completed";

export function AdminRoutesPage() {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [scenario, setScenario] = useState("DEMO");
  const [runData, setRunData] = useState<OptimizationRunResponse | null>(null);
  const [vehicles, setVehicles] = useState<Record<string, any>>({});
  const [orders, setOrders] = useState<Record<string, any>>({});
  const [returnLoads, setReturnLoads] = useState<Record<string, any>>({});
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [, setPartialErrors] = useState<string[]>([]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Animation
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const progressRef = useRef(0);

  // ─── Data fetch ───
  useEffect(() => {
    let active = true;
    setFetchStatus("loading");
    setError(null);
    setPartialErrors([]);
    setRunData(null);
    import("../services/apiClient").then(({ api }) => {
      // Use Promise.allSettled for fleet/orders to prevent complete failure if they fail, but optimization must succeed
      api.optimization.getLatest(scenario)
        .then(async (optRes) => {
          if (!active) return;
          setRunData(optRes);

          // Once optimization is fetched, fetch related data safely
          const [fRes, oRes, rlRes] = await Promise.allSettled([
            api.fleet.listVehicles(),
            api.orders.list(),
            api.returnLoads.list()
          ]);

          if (!active) return;

          const errs: string[] = [];
          const vMap: Record<string, any> = {};
          const oMap: Record<string, any> = {};
          const rlMap: Record<string, any> = {};

          if (fRes.status === "fulfilled") {
            fRes.value.items.forEach((v: any) => { vMap[v.id] = v; });
          } else {
            errs.push("Vehicles");
          }

          if (oRes.status === "fulfilled") {
            oRes.value.items.forEach((o: any) => { oMap[o.id] = o; });
          } else {
            errs.push("Orders");
          }

          if (rlRes.status === "fulfilled") {
            rlRes.value.items.forEach((r: any) => { rlMap[r.id] = r; });
          } else {
            errs.push("Return Loads");
          }
          
          setVehicles(vMap);
          setOrders(oMap);
          setReturnLoads(rlMap);
          setPartialErrors(errs);
          setFetchStatus("success");
        })
        .catch(err => {
          if (!active) return;
          if (err.response?.status === 404) {
            setRunData(null);
            setFetchStatus("success");
          } else {
            console.error(err);
            setError("Failed to fetch route data.");
            setFetchStatus("error");
          }
        });
    });
    return () => { active = false; };
  }, [scenario]);

  // ─── Derived ───
  const route = runData?.routes?.[selectedIndex] || runData?.routes?.[0];
  const hasGeometry = !!route?.geometry?.coordinates?.length && route.geometry.coordinates.length >= 2;

  const positions: [number, number][] = useMemo(
    () => hasGeometry ? route!.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]) : [],
    [route, hasGeometry]
  );
  const cumDist = useMemo(() => buildCumulativeDistances(positions), [positions]);
  const totalDistKm = cumDist.length > 0 ? cumDist[cumDist.length - 1] / 1000 : 0;

  // ─── Reset on route switch ───
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    setPlayState("idle");
    setProgress(0);
    progressRef.current = 0;
    lastTimeRef.current = 0;
  }, [selectedIndex]);

  // ─── Animation loop ───
  const PLAYBACK_DURATION_BASE = 12;
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    const next = Math.min(progressRef.current + (dt * speed) / PLAYBACK_DURATION_BASE, 1);
    progressRef.current = next;
    setProgress(next);
    if (next >= 1) { setPlayState("completed"); return; }
    rafRef.current = requestAnimationFrame(animate);
  }, [speed]);

  useEffect(() => {
    if (playState === "playing") {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playState, animate]);

  // ─── Handlers ───
  const handlePlay = () => {
    if (!hasGeometry) return;
    if (playState === "completed") { progressRef.current = 0; setProgress(0); }
    setPlayState("playing");
  };
  const handlePause = () => setPlayState("paused");
  const handleReset = () => {
    cancelAnimationFrame(rafRef.current);
    progressRef.current = 0; setProgress(0); setPlayState("idle"); lastTimeRef.current = 0;
  };

  // ─── Label helpers ───
  function stopLabel(s: any, i: number, total: number): string {
    const st = s.stop_type;
    if (st === "DEPOT" || st === "DEPOT_START" || st === "DEPOT_END" || (!st && (i === 0 || i === total - 1))) return "Depot";
    if (st === "ORDER") return "Delivery";
    if (st === "RETURN_PICKUP") return "Return Pickup";
    if (st === "RETURN_DELIVERY") return "Return Delivery";
    return `Stop ${i + 1}`;
  }
  function stopRef(s: any): string | null {
    if (s.order_id && orders[s.order_id]) return orders[s.order_id].reference_number || s.order_id.slice(0, 8);
    if (s.return_load_id && returnLoads[s.return_load_id]) return returnLoads[s.return_load_id].reference_number || s.return_load_id.slice(0, 8);
    if (s.return_load_id) return s.return_load_id.slice(0, 8);
    if (s.order_id) return s.order_id.slice(0, 8);
    return null;
  }

  // ─── Early returns ───
  if (fetchStatus === "loading") {
    return (
      <div style={{ padding: 26, display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Route Intelligence</div>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 16 }}>Inspect optimized route geometries, stop schedules, and vehicle dispatch.</div>
        
        <div style={{ marginBottom: 16, width: 240 }}>
          <select 
            aria-label="Select Scenario"
            value={scenario} 
            onChange={(e) => setScenario(e.target.value)}
            disabled
            style={{ width: "100%", padding: "8px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 13 }}
          >
            <option value="DEMO">Indore Regional Operations</option>
            <option value="NETWORK">Extended Network Operations</option>
          </select>
        </div>

        <div role="status" aria-label="Loading route data" style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: C.slate, gap: 10 }}>
          <Loader2 size={18} className="spin" aria-hidden="true" /> Loading route data...
        </div>
      </div>
    );
  }

  if (fetchStatus === "error") {
    return (
      <div style={{ padding: 26, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 60px)", gap: 12 }}>
        <AlertCircle size={24} color={C.coral} />
        <div style={{ fontSize: 14, color: C.ink }}>{error || "Failed to load route data."}</div>
        <button onClick={() => setScenario(scenario)} style={{ background: C.ink, color: C.ivory, border: "none", padding: "8px 18px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  if (!runData) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Route Intelligence</div>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 16 }}>Inspect optimized route geometries, stop schedules, and vehicle dispatch.</div>
        
        <div style={{ marginBottom: 16, width: 240 }}>
          <select 
            aria-label="Select Scenario"
            value={scenario} 
            onChange={(e) => setScenario(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 13 }}
          >
            <option value="DEMO">Indore Regional Operations</option>
            <option value="NETWORK">Extended Network Operations</option>
          </select>
        </div>

        <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px dashed ${C.stone}`, borderRadius: 6, color: C.slate, marginTop: 20, background: C.cream }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>No optimization run available for this scenario.</div>
          <button 
            onClick={() => navigate("/app/optimize")}
            style={{ background: C.coral, color: C.ivory, border: "none", padding: "8px 16px", borderRadius: 4, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
          >
            <Settings size={14} /> Go to Optimize
          </button>
        </div>
      </div>
    );
  }

  if (!runData.routes || runData.routes.length === 0) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Route Intelligence</div>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 16 }}>Inspect optimized route geometries, stop schedules, and vehicle dispatch.</div>
        
        <div style={{ marginBottom: 16, width: 240 }}>
          <select 
            aria-label="Select Scenario"
            value={scenario} 
            onChange={(e) => setScenario(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 13 }}
          >
            <option value="DEMO">Indore Regional Operations</option>
            <option value="NETWORK">Extended Network Operations</option>
          </select>
        </div>

        <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px dashed ${C.stone}`, borderRadius: 6, color: C.slate, marginTop: 20, background: C.cream }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>Optimization completed but produced no routes.</div>
          <button 
            onClick={() => navigate("/app/optimize")}
            style={{ background: C.coral, color: C.ivory, border: "none", padding: "8px 16px", borderRadius: 4, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
          >
            <Settings size={14} /> Review Optimization
          </button>
        </div>
      </div>
    );
  }

  const defaultCenter: [number, number] = positions.length > 0 ? positions[0] : [22.7196, 75.8577];
  const progressKm = totalDistKm * progress;

  // Derived detail data
  const vehRef = vehicles[route!.vehicle_id]?.reference_number || route!.vehicle_id.slice(0, 8);

  const routeRlId = typeof route!.return_load === "string" ? route!.return_load : null;



  const simStatusLabel = playState === "idle" ? "Ready" : playState === "playing" ? "Playing" : playState === "paused" ? "Paused" : "Complete";

  // ─── UI ────────────────────────────────────────────────────────
  // ─── Extracted Map Node ───
  const mapNode = (
    <div style={{ width: "100%", height: 520, minHeight: "auto", background: C.cream, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.stone}`, position: "relative", zIndex: 10 }}>
      {hasGeometry ? (
        <MapContainer key={selectedIndex} center={defaultCenter} zoom={10} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds positions={positions} />
          <Polyline positions={positions} pathOptions={{ color: C.coral, weight: 4, opacity: 0.85 }} />
          {route!.stops.map((s: any, i: number) => {
            if (!s.location) return null;
            const colors = getStopColor(s, i, route!.stops.length);
            const label = stopLabel(s, i, route!.stops.length);
            const ref = stopRef(s);
            return (
              <CircleMarker key={i} center={[s.location[0], s.location[1]]} radius={colors === STOP_COLORS.DEPOT ? 8 : 6}
                pathOptions={{ color: colors.stroke, fillColor: colors.fill, fillOpacity: 0.9, weight: 2 }}>
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <strong>{String(i + 1).padStart(2, "0")} — {label}</strong>
                    {ref && <div style={{ fontSize: 11, color: "#666" }}>{ref}</div>}
                    <div style={{ fontSize: 10, color: "#999" }}>{s.location[0].toFixed(4)}, {s.location[1].toFixed(4)}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
          <VehicleMarker positions={positions} cumDist={cumDist} progress={progress} />
        </MapContainer>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.slate, fontSize: 13 }}>
          Route geometry unavailable.
        </div>
      )}
      {/* Legend */}
      <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 1000, background: "rgba(250,246,239,0.92)", borderRadius: 6, padding: "8px 12px", border: `1px solid ${C.stone}`, fontSize: 10.5 }}>
        {Object.entries(STOP_COLORS).map(([key, val]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: val.fill, border: `1.5px solid ${val.stroke}`, flexShrink: 0 }} />
            <span style={{ color: C.ink }}>{val.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.ink, border: `1.5px solid ${C.ivory}`, flexShrink: 0 }} />
          <span style={{ color: C.ink }}>Vehicle</span>
        </div>
      </div>
    </div>
  );

  // ─── Extracted Playback Controls Node ───
  const playbackControlsNode = (
    <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ fontSize: 10, fontFamily: mono, color: C.slate, textTransform: "uppercase", letterSpacing: 1 }}>Simulation</div>
      <div style={{ display: "flex", gap: 4 }}>
        {playState === "playing" ? (
          <button aria-label="Pause" onClick={handlePause} style={controlBtn}><Pause size={13} aria-hidden="true" /></button>
        ) : (
          <button aria-label="Play" onClick={handlePlay} disabled={!hasGeometry} style={{ ...controlBtn, opacity: hasGeometry ? 1 : 0.4 }}><Play size={13} aria-hidden="true" /></button>
        )}
        <button aria-label="Reset simulation" onClick={handleReset} style={controlBtn}><RotateCcw size={13} aria-hidden="true" /></button>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {[1, 2, 4].map(s => (
          <button aria-label={`Speed ${s}x`} aria-pressed={speed === s} key={s} onClick={() => setSpeed(s)} style={{
            ...controlBtn, background: speed === s ? C.ink : C.cream, color: speed === s ? C.ivory : C.ink,
            fontSize: 10.5, padding: "3px 7px", minWidth: 0,
          }}>{s}×</button>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 80, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 4, background: C.stone, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${(progress * 100).toFixed(1)}%`, height: "100%", background: C.coral, borderRadius: 2, transition: playState === "playing" ? "none" : "width 0.2s" }} />
        </div>
        <span style={{ fontSize: 10.5, fontFamily: mono, color: C.slate, whiteSpace: "nowrap" }}>
          {progressKm.toFixed(1)}/{totalDistKm.toFixed(1)} km
        </span>
      </div>
      <div style={{ fontSize: 10.5, fontFamily: mono, padding: "2px 8px", borderRadius: 999,
        background: playState === "completed" ? C.emerald : playState === "playing" ? C.coral : C.cream,
        color: playState === "completed" || playState === "playing" ? C.ivory : C.slate }}>
        {simStatusLabel}
      </div>
    </div>
  );

  // ─── Unified Layout Branch ───

    const matchedReturnLoads = runData.routes.filter(r => r.return_load).length;

    return (
      <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        {/* HEADER */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: 8, textTransform: "uppercase" }}>Network Routes</div>
            <div style={{ fontSize: 14.5, color: C.slate, maxWidth: 700, lineHeight: 1.5 }}>
              Inspect optimized routes, vehicle assignments, delivery sequences and return-load matches across the CargoSync network.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(23,124,107,0.1)", color: C.emerald, padding: "6px 12px", borderRadius: 999, fontWeight: 600, fontSize: 12, border: "1px solid rgba(23,124,107,0.2)" }}>
            <CheckCircle2 size={14} /> OPTIMIZED ROUTES
          </div>
        </div>

        {/* OPERATIONAL SNAPSHOT */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
           <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
              <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8, fontFamily: mono, textTransform: "uppercase" }}>Total Routes</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: C.ink }}>{runData.routes.length}</div>
           </div>
           <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
              <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8, fontFamily: mono, textTransform: "uppercase" }}>Vehicles Assigned</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: C.ink }}>{new Set(runData.routes.map(r => r.vehicle_id)).size}</div>
           </div>
           <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
              <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8, fontFamily: mono, textTransform: "uppercase" }}>Total Stops</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: C.ink }}>{runData.routes.reduce((acc, r) => acc + r.stops.length, 0)}</div>
           </div>
           <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
              <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8, fontFamily: mono, textTransform: "uppercase" }}>Routes w/ Return Loads</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: C.coral }}>{matchedReturnLoads}</div>
           </div>
        </div>

        {/* WORKSPACE GRID */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "340px 1fr", gap: 24, alignItems: "start", marginBottom: 32 }}>
           
           {/* LEFT: ROUTE LIST */}
           <div style={{ display: "flex", flexDirection: "column", gap: 24, maxHeight: isMobile ? "auto" : 600, overflowY: "auto", paddingRight: 4 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.slate, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Network Route List</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {runData.routes.map((r, i) => {
                    const isSel = selectedIndex === i;
                    const vRef = vehicles[r.vehicle_id]?.reference_number || r.vehicle_id.slice(0, 8);
                    const opName = vehicles[r.vehicle_id]?.operator?.name || "Unknown Operator";
                    return (
                      <div 
                        key={i} 
                        role="button"
                        tabIndex={0}
                        aria-selected={isSel}
                        onClick={() => setSelectedIndex(i)} 
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedIndex(i); } }}
                        style={{
                          padding: 16, border: `1px solid ${isSel ? C.navy : C.stone}`,
                          borderRadius: 8, background: isSel ? C.ivory : C.cream,
                          cursor: "pointer", transition: "all 0.2s",
                          boxShadow: isSel ? "0 4px 12px rgba(27,35,51,0.08)" : "none"
                        }}
                        className={!isSel ? "c-card-hover" : ""}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: isSel ? C.navy : C.ink }}>Route {String(i + 1).padStart(2, "0")}</div>
                          {!!r.return_load && <div style={{ background: "rgba(232,84,46,0.1)", color: C.coral, padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: mono }}>RETURN LOAD</div>}
                        </div>
                        <div style={{ fontSize: 12, color: C.slate, marginBottom: 8 }}>{opName}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <Truck size={14} color={C.slate} />
                          <div style={{ fontSize: 12, fontFamily: mono, color: C.slate }}>
                            {vRef}
                          </div>
                        </div>
                        <div style={{ fontSize: 11.5, color: C.slate, display: "flex", gap: 12 }}>
                          <span>{(r.total_distance_meters / 1000).toFixed(1)} km</span>
                          <span>{r.stops.length} stops</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
           </div>

           {/* RIGHT: ROUTE DETAILS */}
           <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              
              {/* SELECTED ROUTE DETAILS */}
              <div style={{ background: C.navy, borderRadius: 8, padding: 24, color: C.ivory, border: `1px solid ${C.charcoal}` }}>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontFamily: mono, color: C.ivory, letterSpacing: 1, fontWeight: 700 }}>ROUTE {String(selectedIndex + 1).padStart(2, "0")}</div>
                    {routeRlId && <div style={{ fontSize: 11, background: "rgba(232,84,46,0.2)", color: C.coral, padding: "4px 10px", borderRadius: 4, fontWeight: 600, fontFamily: mono }}>RETURN LOAD MATCHED</div>}
                 </div>
                 
                 <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, marginBottom: 24 }}>
                   <div>
                      <div style={{ fontSize: 11, color: "rgba(250,246,239,0.7)", marginBottom: 4, textTransform: "uppercase" }}>Assigned Vehicle</div>
                      <div style={{ fontSize: 16, fontWeight: 600, fontFamily: mono, color: C.ivory }}>{vehRef}</div>
                   </div>
                   <div>
                      <div style={{ fontSize: 11, color: "rgba(250,246,239,0.7)", marginBottom: 4, textTransform: "uppercase" }}>Operator</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: C.ivory }}>{vehicles[route!.vehicle_id]?.operator?.name || "Unknown"}</div>
                   </div>
                 </div>

                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, background: "rgba(0,0,0,0.15)", padding: 16, borderRadius: 6 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(250,246,239,0.7)", marginBottom: 4 }}>Distance</div>
                      <div style={{ fontSize: 15, fontWeight: 600, fontFamily: mono }}>{route!.total_distance_meters != null ? `${(route!.total_distance_meters / 1000).toFixed(1)} km` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(250,246,239,0.7)", marginBottom: 4 }}>Duration</div>
                      <div style={{ fontSize: 15, fontWeight: 600, fontFamily: mono }}>{route!.total_duration_seconds != null ? fmtDuration(route!.total_duration_seconds) : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(250,246,239,0.7)", marginBottom: 4 }}>Total Stops</div>
                      <div style={{ fontSize: 15, fontWeight: 600, fontFamily: mono }}>{route!.stops?.length || 0}</div>
                    </div>
                 </div>
              </div>

              {/* ROUTE STOPS & RETURN LOAD SEQUENCE */}
              <div style={{ background: C.ivory, borderRadius: 8, padding: 24, border: `1px solid ${C.stone}` }}>
                 <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 20 }}>Delivery Sequence</div>
                 
                 <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {route!.stops.map((stop: any, idx: number) => {

                      const stopLabelText = stopLabel(stop, idx, route!.stops.length);
                      const ref = stopRef(stop);
                      
                      let badgeColor = C.slate;
                      if (stop.stop_type === "ORDER") badgeColor = C.coral;
                      if (stop.stop_type === "RETURN_PICKUP") badgeColor = C.emerald;
                      if (stop.stop_type === "RETURN_DELIVERY") badgeColor = "#8B5CF6";

                      return (
                        <div key={idx} style={{ display: "flex", gap: 16, position: "relative" }}>
                          {idx < route!.stops.length - 1 && (
                            <div style={{ position: "absolute", left: 13, top: 24, bottom: -16, width: 2, background: C.stone }} />
                          )}
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.cream, border: `2px solid ${badgeColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 2 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: badgeColor }} />
                          </div>
                          <div style={{ paddingBottom: 12 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{stopLabelText}</div>
                            {ref && <div style={{ fontSize: 13, color: C.slate, fontFamily: mono, marginTop: 4 }}>ID: {ref}</div>}
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </div>

           </div>
        </div>

        {/* BOTTOM: MAP */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, height: 600 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.slate, letterSpacing: "0.05em", textTransform: "uppercase" }}>Route Visualization</div>
          {mapNode}
          {playbackControlsNode}
        </div>

      </div>
    );
}



// ─── Shared button style ─────────────────────────────────────────
const controlBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 30, height: 26, border: `1px solid ${C.stone}`, borderRadius: 4,
  background: C.cream, cursor: "pointer", color: C.ink, fontSize: 12,
};
