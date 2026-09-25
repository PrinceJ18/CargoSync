import { useState, useEffect } from "react";
import { CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Route as RouteIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { C, mono } from "../data/prototype/designTokens";
import { useMobile } from "../hooks/useMobile";

import type { OptimizationRunResponse } from "../types/api";
import { AdminOptimizationPage } from "./AdminOptimizationPage";




export function OptimizePage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  if (isAdmin) {
    return <AdminOptimizationPage />;
  }

  const navigate = useNavigate();
  const isMobile = useMobile();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OptimizationRunResponse | null>(null);
  const [scenario, setScenario] = useState("DEMO");
  const [error, setError] = useState<string | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);
  
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [fleetCount, setFleetCount] = useState<number | null>(null);
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
        const [ordersRes, fleetRes] = await Promise.all([
           api.orders.list({ page: 1, page_size: 1, scenario }),
           api.fleet.listVehicles({ page: 1, page_size: 1, scenario })
        ]);
        if (active) {
          setOrderCount(ordersRes.total);
          setFleetCount(fleetRes.total);
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
    <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      {/* HEADER */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: 8 }}>Optimization Opportunities</div>
        <div style={{ fontSize: 14.5, color: C.slate, maxWidth: 650, lineHeight: 1.5 }}>
          Turn your current orders and available fleet into coordinated, more efficient routes. CargoSync evaluates your operation to identify better routing opportunities.
        </div>
        {/* Quick Scenario Toggle */}
        <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
           <span style={{ fontSize: 13, fontWeight: 600, color: C.slate }}>Scenario:</span>
           <select 
              aria-label="Select Scenario"
              value={scenario} 
              onChange={(e) => { if (!running) setScenario(e.target.value); }}
              disabled={running}
              style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 13, background: C.ivory, color: C.ink, fontWeight: 500, cursor: "pointer", outline: "none" }}
           >
             <option value="DEMO">Indore Regional Operations</option>
             <option value="NETWORK">Extended Network</option>
           </select>
        </div>
      </div>

      {/* OPERATIONAL INPUT SNAPSHOT */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.slate, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Current Operation Input</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 2fr", gap: 16 }}>
           <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
              <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8 }}>Demand</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: C.ink }}>
                {loadingStats ? "—" : orderCount ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>Pending Orders</div>
           </div>
           <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
              <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8 }}>Supply</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: C.ink }}>
                {loadingStats ? "—" : fleetCount ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>Available Vehicles</div>
           </div>
           
           <div className="c-card" style={{ background: C.cream, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 12 }}>CargoSync Intelligence Pipeline</div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontFamily: mono, background: C.ivory, border: `1px solid ${C.stone}`, padding: "4px 8px", borderRadius: 4, color: C.slate }}>Orders</span>
                <ArrowRight size={12} color={C.stone} />
                <span style={{ fontSize: 11, fontFamily: mono, background: C.ivory, border: `1px solid ${C.stone}`, padding: "4px 8px", borderRadius: 4, color: C.slate }}>Geo-Clustering</span>
                <ArrowRight size={12} color={C.stone} />
                <span style={{ fontSize: 11, fontFamily: mono, background: C.ivory, border: `1px solid ${C.stone}`, padding: "4px 8px", borderRadius: 4, color: C.slate }}>Fleet Capacity</span>
                <ArrowRight size={12} color={C.stone} />
                <span style={{ fontSize: 11, fontFamily: mono, background: C.ivory, border: `1px solid ${C.stone}`, padding: "4px 8px", borderRadius: 4, color: C.slate }}>Constraints</span>
                <ArrowRight size={12} color={C.stone} />
                <span style={{ fontSize: 11, fontFamily: mono, background: C.ivory, border: `1px solid ${C.stone}`, padding: "4px 8px", borderRadius: 4, color: C.slate }}>Optimized</span>
              </div>
           </div>
        </div>
      </div>

      {/* OPTIMIZATION ACTION / STATUS */}
      <div style={{ background: C.navy, borderRadius: 8, padding: isMobile ? 24 : 32, color: C.ivory, marginBottom: 40, border: `1px solid ${C.charcoal}`, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
         <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 20 }}>
            <div>
               <div style={{ fontSize: 18, fontWeight: 700, color: C.ivory, marginBottom: 8 }}>Ready to optimize your current operation</div>
               <div style={{ fontSize: 14, color: C.slate, maxWidth: 500 }}>
                 Run the CargoSync engine to evaluate all possible route combinations and identify the most efficient logistics plan.
               </div>
            </div>
            
            <button 
              onClick={run} 
              disabled={running} 
              style={{ 
                background: C.coral, color: C.ivory, border: "none", padding: "14px 28px", borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: running ? "default" : "pointer", opacity: running ? 0.8 : 1, transition: "background 0.2s", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, width: isMobile ? "100%" : "auto", justifyContent: "center"
              }}
            >
              {running && <RefreshCw size={16} className="spin" />}
              {running ? "Optimizing Routes..." : "Run Optimization"}
            </button>
         </div>

         {error && (
            <div className="fade-in" style={{ marginTop: 24, color: "#FFA6A6", fontSize: 13, background: "rgba(232,84,46,0.15)", padding: 12, borderRadius: 6, border: "1px solid rgba(232,84,46,0.3)" }}>
              {error}
            </div>
         )}
      </div>

      {/* BEFORE vs CARGOSYNC OPTIMIZED & IMPACT */}
      {!running && loadingLatest && (
         <div className="fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: C.slate, gap: 10 }}>
            <RefreshCw size={18} className="spin" /> Loading optimization results...
         </div>
      )}

      {!running && !loadingLatest && result && result.metrics && (
         <div className="fade-in">
            <div style={{ fontSize: 13, fontWeight: 700, color: C.slate, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 16 }}>Comparison</div>
            
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24, marginBottom: 32 }}>
               {/* BASELINE */}
               <div style={{ background: C.ivory, borderRadius: 8, padding: 24, border: `1px solid ${C.stone}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: C.slate, marginBottom: 20 }}>CURRENT OPERATION (BASELINE)</div>
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

               {/* OPTIMIZED */}
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

            {/* IMPACT SUMMARY */}
            <div style={{ background: C.ivory, borderRadius: 8, padding: 24, border: `1px solid ${C.stone}`, marginBottom: 32 }}>
               <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 20 }}>Measurable Operational Impact</div>
               <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: C.slate, fontFamily: mono }}>Distance Saved</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: C.emerald }}>{result.metrics.savings?.distance_saved_meters != null ? `${(result.metrics.savings.distance_saved_meters / 1000).toFixed(1)} km` : "—"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: C.slate, fontFamily: mono }}>Cost Saved</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: C.emerald }}>{result.metrics.savings?.cost_saved_inr != null ? `₹${Math.round(result.metrics.savings.cost_saved_inr).toLocaleString()}` : "—"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: C.slate, fontFamily: mono }}>Return Loads</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: C.coral }}>{matchedReturnLoads}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: C.slate, fontFamily: mono }}>CO₂ Avoided</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: C.emerald }}>{result.metrics.savings?.co2_saved_kg != null ? `${result.metrics.savings.co2_saved_kg.toFixed(1)} kg` : "—"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: C.slate, fontFamily: mono }}>Run ID</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: C.slate, fontFamily: mono, wordBreak: "break-all", marginTop: "auto" }}>{result.run_id?.slice(0, 8) || "—"}</span>
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
                    View Assigned Routes <RouteIcon size={16} />
                  </button>
               </div>
            )}
         </div>
      )}
    </div>
  );
}
