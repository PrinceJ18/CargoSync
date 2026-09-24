import { useState, useEffect } from "react";
import { CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Route as RouteIcon, Package, Truck, Clock, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { C, mono } from "../data/prototype/designTokens";
import { useMobile } from "../hooks/useMobile";
import type { OptimizationRunResponse } from "../types/api";

export function AdminOptimizationResultsPage() {
  const navigate = useNavigate();
  const isMobile = useMobile();
  
  const [result, setResult] = useState<OptimizationRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Defaulting to "NETWORK" scenario for Admin, but allowing fallback to DEMO if needed.
  // In a robust implementation, this might read from global state or query params.
  const scenario = "NETWORK"; // or "DEMO" if we prefer checking both. We can check one, if null check other.

  useEffect(() => {
    let active = true;
    const fetchLatest = async () => {
      setLoading(true);
      setError(null);
      try {
        const { api } = await import("../services/apiClient");
        // Try NETWORK first, if 404 try DEMO
        try {
          const res = await api.optimization.getLatest("NETWORK");
          if (active) setResult(res);
        } catch (err: any) {
          if (err.status === 404 || err.code === "NOT_FOUND") {
            try {
              const demoRes = await api.optimization.getLatest("DEMO");
              if (active) setResult(demoRes);
            } catch (demoErr: any) {
              if (active) {
                if (demoErr.status !== 404 && demoErr.code !== "NOT_FOUND") {
                  setError(demoErr.message || "Failed to fetch optimization result.");
                } else {
                  setResult(null); // Truly no run available
                }
              }
            }
          } else {
            if (active) setError(err.message || "Failed to fetch optimization result.");
          }
        }
      } catch (err: any) {
        if (active) setError(err.message || "Network error.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchLatest();
    return () => { active = false; };
  }, []);

  const handleGoToCenter = () => {
    navigate("/app/optimize");
  };

  const handleGoToRoutes = () => {
    navigate("/app/routes");
  };

  if (loading) {
    return (
      <div className="fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: C.slate, gap: 10 }}>
        <RefreshCw size={24} className="spin" /> Loading optimization results...
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div style={{ background: "rgba(232,84,46,0.1)", border: `1px solid rgba(232,84,46,0.3)`, color: C.coral, padding: 32, borderRadius: 8, textAlign: "center" }}>
          <AlertTriangle size={32} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Error Loading Results</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>{error}</div>
          <button onClick={handleGoToCenter} style={{ marginTop: 24, background: C.coral, color: C.ivory, border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Return to Optimization Center
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
         <div style={{ background: C.ivory, border: `1px dashed ${C.stone}`, borderRadius: 8, padding: 60, textAlign: "center" }}>
           <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 8 }}>NO NETWORK OPTIMIZATION RESULT</div>
           <div style={{ color: C.slate, fontSize: 14, marginBottom: 24 }}>Run an optimization from the Optimization Center to generate network routing results.</div>
           <button onClick={handleGoToCenter} style={{ background: C.navy, color: C.ivory, border: "none", padding: "12px 24px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
             Go to Optimization Center
           </button>
        </div>
      </div>
    );
  }

  // Derive metrics safely
  const bDist = result.metrics?.baseline?.distance_meters;
  const oDist = result.metrics?.optimized?.distance_meters;
  const bDur = result.metrics?.baseline?.duration_seconds;
  const oDur = result.metrics?.optimized?.duration_seconds;
  const bVeh = result.metrics?.baseline?.vehicles_used;
  const oVeh = result.metrics?.optimized?.vehicles_used;

  const routes = result.routes || [];
  const matchedRoutes = routes.filter(r => r.stops.some(s => !!s.return_load_id));
  const returnLoadCount = matchedRoutes.length;

  return (
    <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
      {/* SECTION 1 - HEADER */}
      <div style={{ marginBottom: 32, display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 10 }}>
            CARGOSYNC OPTIMIZATION RESULTS
          </div>
          <div style={{ fontSize: 14, color: C.slate, marginTop: 8, maxWidth: 800, lineHeight: 1.5 }}>
            Inspect the output produced by the network optimization engine.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: result.status === "COMPLETED" ? "rgba(30,143,107,0.1)" : "rgba(232,84,46,0.1)", color: result.status === "COMPLETED" ? C.emerald : C.coral, padding: "8px 16px", borderRadius: 999, fontWeight: 600, fontSize: 13, border: `1px solid ${result.status === "COMPLETED" ? "rgba(30,143,107,0.2)" : "rgba(232,84,46,0.2)"}` }}>
          {result.status === "COMPLETED" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {result.status}
        </div>
      </div>

      {/* SECTION 12 - OPTIMIZATION FLOW VISUALIZATION */}
      <div style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}`, marginBottom: 32, overflowX: "auto" }}>
        <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: "center", paddingBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: mono, background: C.cream, border: `1px solid ${C.stone}`, padding: "6px 10px", borderRadius: 4, color: C.ink, whiteSpace: "nowrap" }}>NETWORK ORDERS</span>
          <ArrowRight size={14} color={C.slate} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: mono, background: C.cream, border: `1px solid ${C.stone}`, padding: "6px 10px", borderRadius: 4, color: C.ink, whiteSpace: "nowrap" }}>CLUSTERING</span>
          <ArrowRight size={14} color={C.slate} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: mono, background: C.cream, border: `1px solid ${C.stone}`, padding: "6px 10px", borderRadius: 4, color: C.ink, whiteSpace: "nowrap" }}>FLEET ALLOCATION</span>
          <ArrowRight size={14} color={C.slate} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: mono, background: C.cream, border: `1px solid ${C.stone}`, padding: "6px 10px", borderRadius: 4, color: C.ink, whiteSpace: "nowrap" }}>ROUTE OPTIMIZATION</span>
          <ArrowRight size={14} color={C.slate} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: mono, background: C.cream, border: `1px solid ${C.stone}`, padding: "6px 10px", borderRadius: 4, color: C.ink, whiteSpace: "nowrap" }}>RETURN LOAD MATCHING</span>
          <ArrowRight size={14} color={C.slate} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: mono, background: "rgba(30,143,107,0.1)", border: `1px solid ${C.emerald}`, padding: "6px 10px", borderRadius: 4, color: C.emerald, whiteSpace: "nowrap" }}>RESULT</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "340px 1fr", gap: 24, alignItems: "start", marginBottom: 32 }}>
        
        {/* LEFT COLUMN */}
        <div>
          {/* SECTION 7 - LATEST RUN SUMMARY */}
          <div style={{ background: C.navy, borderRadius: 8, padding: 24, color: C.ivory, border: `1px solid ${C.charcoal}`, marginBottom: 24 }}>
             <div style={{ fontSize: 13, fontWeight: 700, color: C.ivory, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 20 }}>Latest Run Info</div>
             
             <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.charcoal}`, paddingBottom: 12 }}>
                 <span style={{ fontSize: 13, color: C.slate }}>Run ID</span>
                 <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 600, color: C.ivory }}>{result.run_id?.slice(0, 8)}</span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.charcoal}`, paddingBottom: 12 }}>
                 <span style={{ fontSize: 13, color: C.slate }}>Scenario</span>
                 <span style={{ fontSize: 13, fontWeight: 600, color: C.ivory }}>{result.scenario}</span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <span style={{ fontSize: 13, color: C.slate }}>Routes Generated</span>
                 <span style={{ fontSize: 13, fontWeight: 600, color: C.emerald }}>{routes.length}</span>
               </div>
             </div>
          </div>

          {/* SECTION 13 - RESULT INTERPRETATION */}
          <div style={{ background: C.ivory, padding: 24, borderRadius: 8, border: `1px solid ${C.stone}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 16, letterSpacing: "0.02em" }}>Operational Insights</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: C.slate, fontSize: 13.5, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 12 }}>
              {bVeh != null && oVeh != null && bVeh > oVeh && (
                <li>CargoSync reduced vehicles used from <strong>{bVeh}</strong> to <strong>{oVeh}</strong>.</li>
              )}
              <li>The optimized result contains <strong>{routes.length}</strong> functional routes.</li>
              {returnLoadCount > 0 ? (
                <li><strong>{returnLoadCount}</strong> route(s) include return-load assignments.</li>
              ) : (
                <li>No routes include return-load assignments in this run.</li>
              )}
              {bDist != null && oDist != null && (
                <li>Optimized distance is <strong>{(oDist/1000).toFixed(1)} km</strong> versus <strong>{(bDist/1000).toFixed(1)} km</strong> baseline.</li>
              )}
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* SECTION 8 - BASELINE VS OPTIMIZED */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.slate, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 16 }}>Performance Comparison</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
               {/* BASELINE */}
               <div style={{ background: C.ivory, borderRadius: 8, padding: 24, border: `1px solid ${C.stone}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: C.slate, marginBottom: 20 }}>CURRENT NETWORK (BASELINE)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                        <span style={{ fontSize: 13, color: C.slate }}>Total Distance</span>
                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: C.ink }}>{bDist != null ? `${(bDist / 1000).toFixed(1)} km` : "—"}</span>
                     </div>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                        <span style={{ fontSize: 13, color: C.slate }}>Vehicles Used</span>
                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: C.ink }}>{bVeh != null ? bVeh : "—"}</span>
                     </div>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: C.slate }}>Total Duration</span>
                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: C.ink }}>{bDur != null ? `${(bDur / 3600).toFixed(1)} hrs` : "—"}</span>
                     </div>
                  </div>
               </div>

               {/* OPTIMIZED */}
               <div style={{ background: C.cream, borderRadius: 8, padding: 24, border: `2px solid ${C.emerald}`, boxShadow: "0 4px 12px rgba(23,124,107,0.08)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: C.emerald, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>CARGOSYNC OPTIMIZED</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid rgba(23,124,107,0.1)" }}>
                        <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>Total Distance</span>
                        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: C.emerald }}>{oDist != null ? `${(oDist / 1000).toFixed(1)} km` : "—"}</span>
                     </div>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid rgba(23,124,107,0.1)" }}>
                        <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>Vehicles Used</span>
                        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: C.emerald }}>{oVeh != null ? oVeh : "—"}</span>
                     </div>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>Total Duration</span>
                        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: C.emerald }}>{oDur != null ? `${(oDur / 3600).toFixed(1)} hrs` : "—"}</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* SECTION 9 - OPERATIONAL RESULT SNAPSHOT */}
          <div style={{ background: C.ivory, borderRadius: 8, padding: 24, border: `1px solid ${C.stone}` }}>
             <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 20, letterSpacing: "0.02em" }}>Network Impact Snapshot</div>
             <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.slate, fontFamily: mono, textTransform: "uppercase" }}>Routes Generated</span>
                  <span style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>{routes.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.slate, fontFamily: mono, textTransform: "uppercase" }}>Vehicles Used</span>
                  <span style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>{oVeh ?? "—"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.slate, fontFamily: mono, textTransform: "uppercase" }}>Total Distance</span>
                  <span style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>{oDist != null ? `${(oDist / 1000).toFixed(1)}km` : "—"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.slate, fontFamily: mono, textTransform: "uppercase" }}>Total Duration</span>
                  <span style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>{oDur != null ? `${(oDur / 3600).toFixed(1)}h` : "—"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.slate, fontFamily: mono, textTransform: "uppercase" }}>Return Loads</span>
                  <span style={{ fontSize: 24, fontWeight: 700, color: C.coral }}>{returnLoadCount}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* SECTION 11 - RETURN LOAD MATCHING */}
      <div style={{ background: C.ivory, borderRadius: 8, border: `1px solid ${C.stone}`, marginBottom: 32, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.stone}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(250,246,239,0.5)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 10 }}>
            <Package size={18} color={C.coral} />
            RETURN LOAD MATCHING
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.slate, background: C.cream, padding: "4px 10px", borderRadius: 999, border: `1px solid ${C.stone}` }}>
            Matched Routes: <span style={{ color: C.coral }}>{returnLoadCount}</span>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {returnLoadCount === 0 ? (
            <div style={{ color: C.slate, fontSize: 14, textAlign: "center", padding: "20px 0" }}>
              No return-load matches in this optimization run.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
              {matchedRoutes.map((r, idx) => {
                const returnStop = r.stops.find(s => !!s.return_load_id);
                return (
                  <div key={idx} style={{ padding: 16, border: `1px solid ${C.stone}`, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.cream }}>
                     <div>
                       <div style={{ fontSize: 12, color: C.slate, marginBottom: 4 }}>Vehicle</div>
                       <div style={{ fontSize: 14, fontWeight: 600, fontFamily: mono, color: C.ink }}>{r.vehicle_id.slice(0, 8)}</div>
                     </div>
                     <ArrowRight size={16} color={C.slate} />
                     <div style={{ textAlign: "right" }}>
                       <div style={{ fontSize: 12, color: C.slate, marginBottom: 4 }}>Matched Return Load</div>
                       <div style={{ fontSize: 14, fontWeight: 600, fontFamily: mono, color: C.coral }}>{returnStop?.return_load_id?.slice(0,8)}</div>
                     </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 10 - GENERATED ROUTES OVERVIEW */}
      <div style={{ background: C.ivory, borderRadius: 8, border: `1px solid ${C.stone}`, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.stone}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>GENERATED ROUTES</div>
          <button onClick={handleGoToRoutes} style={{ background: "transparent", border: `1px solid ${C.stone}`, color: C.ink, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            View Route Details <RouteIcon size={14} />
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          {routes.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.slate, fontSize: 14 }}>
              No routes were generated in this run.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(27,35,51,0.02)", borderBottom: `1px solid ${C.stone}` }}>
                  <th style={{ padding: "14px 20px", fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.02em" }}>Route #</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.02em" }}>Vehicle ID</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.02em" }}>Stops</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.02em" }}>Distance</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.02em" }}>Duration</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.02em" }}>Return Load</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r, i) => {
                  const hasReturn = r.stops.some(s => !!s.return_load_id);
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.stone}` }} className="c-table-row">
                      <td style={{ padding: "14px 20px", fontWeight: 600, color: C.ink }}>{i + 1}</td>
                      <td style={{ padding: "14px 20px", fontFamily: mono, color: C.ink }}>{r.vehicle_id.slice(0, 8)}</td>
                      <td style={{ padding: "14px 20px", color: C.ink }}>{r.stops.length}</td>
                      <td style={{ padding: "14px 20px", fontFamily: mono, color: C.ink }}>{(r.total_distance_meters / 1000).toFixed(1)} km</td>
                      <td style={{ padding: "14px 20px", fontFamily: mono, color: C.ink }}>{(r.total_duration_seconds / 3600).toFixed(1)} hrs</td>
                      <td style={{ padding: "14px 20px" }}>
                        {hasReturn ? (
                          <span style={{ background: "rgba(232,84,46,0.1)", color: C.coral, padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>Matched</span>
                        ) : (
                          <span style={{ color: C.slate, fontSize: 12 }}>None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
