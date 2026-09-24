import { useState, useEffect } from "react";
import { CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Route as RouteIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { C, mono } from "../data/prototype/designTokens";
import { useMobile } from "../hooks/useMobile";
import type { OptimizationRunResponse } from "../types/api";

export function AdminOptimizationPage() {
  const navigate = useNavigate();
  const isMobile = useMobile();
  
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OptimizationRunResponse | null>(null);
  const [scenario, setScenario] = useState("DEMO");
  const [error, setError] = useState<string | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);
  
  // Network Input Metrics
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [pendingOrderCount, setPendingOrderCount] = useState<number | null>(null);
  const [fleetCount, setFleetCount] = useState<number | null>(null);
  const [availableFleetCount, setAvailableFleetCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchLatest = async () => {
      setLoadingLatest(true);
      setError(null);
      setResult(null);
      try {
        const { api } = await import("../services/apiClient");
        const res = await api.optimization.getLatest(scenario);
        if (active) setResult(res);
      } catch (err: any) {
        if (active) {
          const apiErr = err as import("../types/api").ApiError;
          if (apiErr.status !== 404 && apiErr.code !== "NOT_FOUND") {
            console.error(apiErr);
            setError(apiErr.message || "Failed to fetch previous optimization run.");
          } else {
            setResult(null);
          }
        }
      } finally {
        if (active) setLoadingLatest(false);
      }
    };
    fetchLatest();
    return () => { active = false; };
  }, [scenario]);

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const { api } = await import("../services/apiClient");
        const [ordersRes, pendingOrdersRes, fleetRes, availFleetRes] = await Promise.all([
           api.orders.list({ page_size: 1, scenario }),
           api.orders.list({ page_size: 1, scenario, status: "PENDING" }),
           api.fleet.listVehicles({ page_size: 1, scenario }),
           api.fleet.listVehicles({ page_size: 1, scenario, status: "AVAILABLE" })
        ]);
        if (active) {
          setOrderCount(ordersRes.total);
          setPendingOrderCount(pendingOrdersRes.total);
          setFleetCount(fleetRes.total);
          setAvailableFleetCount(availFleetRes.total);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoadingStats(false);
      }
    };
    fetchStats();
    return () => { active = false; };
  }, [scenario]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const { api } = await import("../services/apiClient");
      const res = await api.optimization.run({ scenario_id: scenario });
      setResult(res);
    } catch (err: any) {
      console.error(err);
      const apiErr = err as import("../types/api").ApiError;
      setError(apiErr.message || "Failed to run optimization.");
    } finally {
      setRunning(false);
    }
  };

  const handleViewRoutes = () => {
    navigate("/app/routes");
  };

  const matchedReturnLoads = result?.routes?.filter(r => r.return_load).length || 0;

  return (
    <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
      {/* SECTION 1 - HEADER */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 10 }}>
            CARGOSYNC OPTIMIZATION CENTER
          </div>
          <div style={{ fontSize: 14, color: C.slate, marginTop: 8, maxWidth: 800, lineHeight: 1.5 }}>
            Coordinate network demand, fleet capacity, routing and return-load opportunities through CargoSync optimization.
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(30,143,107,0.1)", color: C.emerald, padding: "6px 12px", borderRadius: 999, fontWeight: 600, fontSize: 12, border: "1px solid rgba(30,143,107,0.2)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald }} />
            SYSTEM ONLINE
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 24, alignItems: "start", marginBottom: 32 }}>
        
        {/* LEFT COLUMN: Input Snapshot & Pipeline */}
        <div>
          {/* SECTION 2 - NETWORK INPUT SNAPSHOT */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.slate, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Network Optimization Input</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16 }}>
               <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
                  <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8 }}>Total Orders</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: C.ink }}>
                    {loadingStats ? "—" : orderCount ?? "—"}
                  </div>
               </div>
               <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
                  <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8 }}>Pending / Eligible</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: C.emerald }}>
                    {loadingStats ? "—" : pendingOrderCount ?? "—"}
                  </div>
               </div>
               <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
                  <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8 }}>Total Vehicles</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: C.ink }}>
                    {loadingStats ? "—" : fleetCount ?? "—"}
                  </div>
               </div>
               <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
                  <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8 }}>Available Fleet</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: C.emerald }}>
                    {loadingStats ? "—" : availableFleetCount ?? "—"}
                  </div>
               </div>
            </div>
          </div>

          {/* SECTION 3 - OPTIMIZATION PIPELINE */}
          <div style={{ background: C.ivory, padding: 24, borderRadius: 8, border: `1px solid ${C.stone}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.slate, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 16 }}>CargoSync Optimization Pipeline</div>
            <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: "center", overflowX: "auto", paddingBottom: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, fontFamily: mono, background: C.cream, border: `1px solid ${C.stone}`, padding: "6px 10px", borderRadius: 4, color: C.ink, whiteSpace: "nowrap" }}>ORDERS</span>
              <ArrowRight size={14} color={C.slate} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, fontFamily: mono, background: C.cream, border: `1px solid ${C.stone}`, padding: "6px 10px", borderRadius: 4, color: C.ink, whiteSpace: "nowrap" }}>DEMAND CLUSTERING</span>
              <ArrowRight size={14} color={C.slate} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, fontFamily: mono, background: C.cream, border: `1px solid ${C.stone}`, padding: "6px 10px", borderRadius: 4, color: C.ink, whiteSpace: "nowrap" }}>FLEET ALLOCATION</span>
              <ArrowRight size={14} color={C.slate} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, fontFamily: mono, background: C.cream, border: `1px solid ${C.stone}`, padding: "6px 10px", borderRadius: 4, color: C.ink, whiteSpace: "nowrap" }}>ROUTE OPTIMIZATION</span>
              <ArrowRight size={14} color={C.slate} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, fontFamily: mono, background: C.cream, border: `1px solid ${C.stone}`, padding: "6px 10px", borderRadius: 4, color: C.ink, whiteSpace: "nowrap" }}>RETURN LOAD MATCHING</span>
              <ArrowRight size={14} color={C.slate} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, fontFamily: mono, background: "rgba(30,143,107,0.1)", border: `1px solid ${C.emerald}`, padding: "6px 10px", borderRadius: 4, color: C.emerald, whiteSpace: "nowrap" }}>OPTIMIZED NETWORK</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Action Panel */}
        <div style={{ position: "sticky", top: 24 }}>
          {/* SECTION 4 & 5 - CONFIGURATION AND RUN */}
          <div style={{ background: C.navy, borderRadius: 8, padding: 24, color: C.ivory, border: `1px solid ${C.charcoal}`, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
             <div style={{ fontSize: 16, fontWeight: 700, color: C.ivory, marginBottom: 16 }}>Execution Control</div>
             
             <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Optimization Scenario</label>
                <select 
                   aria-label="Select Scenario"
                   value={scenario} 
                   onChange={(e) => { if (!running) setScenario(e.target.value); }}
                   disabled={running}
                   style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: `1px solid ${C.charcoal}`, fontSize: 14, background: "rgba(255,255,255,0.05)", color: C.ivory, fontWeight: 500, cursor: running ? "not-allowed" : "pointer", outline: "none", appearance: "none" }}
                >
                  <option value="DEMO" style={{ color: C.ink }}>Indore Regional Operations</option>
                  <option value="NETWORK" style={{ color: C.ink }}>Extended Network Operations</option>
                </select>
             </div>

             <button 
               onClick={run} 
               disabled={running || loadingStats || loadingLatest} 
               style={{ 
                 width: "100%", background: C.emerald, color: C.ivory, border: "none", padding: "14px 20px", borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: (running || loadingStats) ? "not-allowed" : "pointer", opacity: (running || loadingStats) ? 0.8 : 1, transition: "background 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10
               }}
             >
               {running && <RefreshCw size={16} className="spin" />}
               {running ? "Optimizing Network..." : "Run Network Optimization"}
             </button>

             {error && (
                <div className="fade-in" style={{ marginTop: 16, color: "#FFA6A6", fontSize: 13, background: "rgba(232,84,46,0.15)", padding: 12, borderRadius: 6, border: "1px solid rgba(232,84,46,0.3)" }}>
                  {error}
                </div>
             )}
          </div>
        </div>

      </div>

      {/* SECTIONS 6, 7, 8 - RESULTS & IMPACT */}
      {!running && loadingLatest && (
         <div className="fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: C.slate, gap: 10 }}>
            <RefreshCw size={20} className="spin" /> Loading network optimization results...
         </div>
      )}

      {!running && !loadingLatest && !result && !error && (
        <div className="fade-in" style={{ background: C.ivory, borderRadius: 8, border: `1px dashed ${C.stone}`, padding: 60, textAlign: "center" }}>
           <div style={{ color: C.slate, fontSize: 14, fontWeight: 500 }}>No network optimization run available yet.</div>
           <div style={{ color: C.slate, fontSize: 13, marginTop: 4 }}>Select a scenario and run the optimization engine to view network results.</div>
        </div>
      )}

      {!running && !loadingLatest && result && result.metrics && (
         <div className="fade-in">
            {/* LATEST RUN SUMMARY */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
               <div style={{ fontSize: 13, fontWeight: 700, color: C.slate, letterSpacing: "0.05em", textTransform: "uppercase" }}>Optimization Results</div>
               <div style={{ fontSize: 12, color: C.slate, fontFamily: mono, display: "flex", gap: 16 }}>
                 <span>Run ID: <strong style={{ color: C.ink }}>{result.run_id?.slice(0, 8)}</strong></span>
                 <span>Status: <strong style={{ color: result.status === "COMPLETED" ? C.emerald : C.coral }}>{result.status}</strong></span>
                 <span>Routes: <strong style={{ color: C.ink }}>{result.routes?.length || 0}</strong></span>
               </div>
            </div>
            
            {/* SECTION 7 - BEFORE VS OPTIMIZED */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24, marginBottom: 24 }}>
               {/* CURRENT NETWORK */}
               <div style={{ background: C.ivory, borderRadius: 8, padding: 24, border: `1px solid ${C.stone}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: C.slate, marginBottom: 20 }}>CURRENT NETWORK (BASELINE)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                        <span style={{ fontSize: 13.5, color: C.slate }}>Total Distance</span>
                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: C.ink }}>{result.metrics.baseline?.distance_meters != null ? `${(result.metrics.baseline.distance_meters / 1000).toFixed(1)} km` : "—"}</span>
                     </div>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                        <span style={{ fontSize: 13.5, color: C.slate }}>Vehicles Used</span>
                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: C.ink }}>{result.metrics.baseline?.vehicles_used?.toString() || "—"}</span>
                     </div>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13.5, color: C.slate }}>Total Duration</span>
                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: C.ink }}>{result.metrics.baseline?.duration_seconds != null ? `${(result.metrics.baseline.duration_seconds / 3600).toFixed(1)} hrs` : "—"}</span>
                     </div>
                  </div>
               </div>

               {/* CARGOSYNC OPTIMIZED */}
               <div style={{ background: C.cream, borderRadius: 8, padding: 24, border: `2px solid ${C.emerald}`, boxShadow: "0 4px 12px rgba(23,124,107,0.08)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: C.emerald, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>CARGOSYNC OPTIMIZED</span>
                    {result.status === "COMPLETED" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} color={C.coral} />}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid rgba(23,124,107,0.1)" }}>
                        <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 500 }}>Total Distance</span>
                        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: C.emerald }}>{result.metrics.optimized?.distance_meters != null ? `${(result.metrics.optimized.distance_meters / 1000).toFixed(1)} km` : "—"}</span>
                     </div>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid rgba(23,124,107,0.1)" }}>
                        <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 500 }}>Vehicles Used</span>
                        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: C.emerald }}>{result.metrics.optimized?.vehicles_used?.toString() || "—"}</span>
                     </div>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 500 }}>Total Duration</span>
                        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: C.emerald }}>{result.metrics.optimized?.duration_seconds != null ? `${(result.metrics.optimized.duration_seconds / 3600).toFixed(1)} hrs` : "—"}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* SECTION 8 - NETWORK IMPACT SUMMARY */}
            <div style={{ background: C.ivory, borderRadius: 8, padding: 24, border: `1px solid ${C.stone}`, marginBottom: 32 }}>
               <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 20, letterSpacing: "0.02em" }}>Network Impact Summary</div>
               <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: C.slate, fontFamily: mono }}>Distance Saved</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: C.emerald }}>{result.metrics.savings?.distance_saved_meters != null ? `${(result.metrics.savings.distance_saved_meters / 1000).toFixed(1)} km` : "—"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: C.slate, fontFamily: mono }}>Cost Saved</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: C.emerald }}>{result.metrics.savings?.cost_saved_inr != null ? `₹${Math.round(result.metrics.savings.cost_saved_inr).toLocaleString()}` : "—"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: C.slate, fontFamily: mono }}>Vehicles Reduced</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: C.emerald }}>
                      {(result.metrics.baseline?.vehicles_used != null && result.metrics.optimized?.vehicles_used != null) 
                        ? result.metrics.baseline.vehicles_used - result.metrics.optimized.vehicles_used 
                        : "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: C.slate, fontFamily: mono }}>CO₂ Avoided</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: C.emerald }}>{result.metrics.savings?.co2_saved_kg != null ? `${result.metrics.savings.co2_saved_kg.toFixed(1)} kg` : "—"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: C.slate, fontFamily: mono }}>Return Loads Matches</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: C.coral }}>{matchedReturnLoads}</span>
                  </div>
               </div>
            </div>

            {/* NEXT STEP */}
            {result.status === "COMPLETED" && (
               <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button 
                    onClick={handleViewRoutes}
                    style={{ background: C.ink, color: C.ivory, border: "none", padding: "12px 24px", borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background 0.2s" }}
                  >
                    View Network Routes <RouteIcon size={16} />
                  </button>
               </div>
            )}
         </div>
      )}
    </div>
  );
}
