import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Settings, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { C } from "../data/prototype/designTokens";

import { Reveal } from "../components/shared/Reveal";
import { useMobile } from "../hooks/useMobile";
import { useAuth } from "../contexts/AuthContext";
import type { OptimizationRunResponse } from "../types/api";

export function ImpactPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [scenario, setScenario] = useState("DEMO");
  const [runData, setRunData] = useState<OptimizationRunResponse | null>(null);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const fetchImpactData = () => {
    let active = true;
    setFetchStatus("loading");
    setError(null);
    setRunData(null);
    import("../services/apiClient").then(({ api }) => {
      api.optimization.getLatest(scenario)
        .then((optRes) => {
          if (!active) return;
          setRunData(optRes);
          setFetchStatus("success");
        })
        .catch((err: import("../types/api").ApiError) => {
          if (!active) return;
          if (err.status === 404 || err.code === "NOT_FOUND") {
            setRunData(null);
            setFetchStatus("success");
          } else {
            console.error(err);
            setError(err.message || "Failed to fetch impact data.");
            setFetchStatus("error");
          }
        });
    });
    return () => { active = false; };
  };

  useEffect(() => {
    return fetchImpactData();
  }, [scenario]);

  // Early returns
  if (fetchStatus === "loading") {
    return (
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Impact & ROI</div>
          <div style={{ width: 240 }}>
            <select 
              aria-label="Select Scenario"
              value={scenario} 
              onChange={(e) => setScenario(e.target.value)}
              disabled
              style={{ width: "100%", padding: "6px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 12 }}
            >
              <option value="DEMO">Indore Regional Operations</option>
              <option value="NETWORK">Extended Network Operations</option>
            </select>
          </div>
        </div>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>Operational savings and environmental impact for the {scenario} scenario.</div>
        
        <div className="fade-in" role="status" aria-label="Loading impact data" style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, color: C.slate, gap: 10 }}>
          <Loader2 size={24} className="spin" aria-hidden="true" /> Loading impact analytics...
        </div>
      </div>
    );
  }

  if (fetchStatus === "error") {
    return (
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Impact & ROI</div>
        </div>
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
          <AlertCircle size={24} color={C.coral} />
          <div style={{ fontSize: 14, color: C.ink }}>{error}</div>
          <button onClick={fetchImpactData} style={{ background: C.ink, color: C.ivory, border: "none", padding: "8px 18px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!runData || runData.status !== "COMPLETED") {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Impact</div>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 16 }}>Operational savings and environmental impact.</div>
        
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
          <div style={{ marginBottom: 12, fontWeight: 600 }}>
            {runData && runData.status === "FAILED" 
              ? "The latest optimization run failed. Impact metrics are unavailable." 
              : "No optimization impact data available yet. Run an optimization first."}
          </div>
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

  // Derived Metrics
  const { metrics, routes } = runData;
  const returnLoadsMatched = routes?.filter(r => r.return_load).length ?? 0;
  
  const bDist = metrics?.baseline?.distance_meters;
  const oDist = metrics?.optimized?.distance_meters;
  const bVeh = metrics?.baseline?.vehicles_used;
  const oVeh = metrics?.optimized?.vehicles_used;



  const vehRedPct = (bVeh && bVeh > 0 && oVeh != null) ? ((bVeh - oVeh) / bVeh) * 100 : null;
  const distRedPct = (bDist && bDist > 0 && oDist != null) ? ((bDist - oDist) / bDist) * 100 : null;

  // ─── Unified Layout Branch ───
    return (
      <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", width: "100%", paddingBottom: 60 }}>
        {/* SECTION 1 — HEADER */}
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", marginBottom: 8 }}>My Analytics</div>
            <div style={{ fontSize: 15, color: C.slate, maxWidth: 600, lineHeight: 1.5 }}>
              {isAdmin 
                ? "Review network-wide impact metrics, cost savings, and operational ROI."
                : "Measure how CargoSync is improving your logistics operation."}
            </div>
          </div>
          <div style={{ width: isMobile ? "100%" : 240 }}>
            <select 
              aria-label="Select Scenario"
              value={scenario} 
              onChange={(e) => setScenario(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 13, background: C.ivory, cursor: "pointer", fontWeight: 500 }}
            >
              <option value="DEMO">Indore Regional Operations</option>
              <option value="NETWORK">Extended Network Operations</option>
            </select>
          </div>
        </div>

        {/* SECTION 2 — OPERATIONAL IMPACT SNAPSHOT */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
          <Reveal delay={0}>
            <div className="c-card" style={{ background: C.ivory, padding: 24, borderRadius: 12, border: `1px solid ${C.stone}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: C.emerald }}></div>
              <div style={{ fontSize: 12, color: C.slate, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Distance Saved</div>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "monospace", color: C.ink }}>
                {metrics?.savings?.distance_saved_meters != null ? `${(metrics.savings.distance_saved_meters / 1000).toFixed(1)} km` : "—"}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="c-card" style={{ background: C.ivory, padding: 24, borderRadius: 12, border: `1px solid ${C.stone}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: C.emerald }}></div>
              <div style={{ fontSize: 12, color: C.slate, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Cost Saved</div>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "monospace", color: C.ink }}>
                {metrics?.savings?.cost_saved_inr != null ? `₹${metrics.savings.cost_saved_inr.toLocaleString()}` : "—"}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="c-card" style={{ background: C.ivory, padding: 24, borderRadius: 12, border: `1px solid ${C.stone}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: C.navy }}></div>
              <div style={{ fontSize: 12, color: C.slate, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Vehicles Reduced</div>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "monospace", color: C.ink }}>
                {vehRedPct != null ? `${vehRedPct.toFixed(1)}%` : "—"}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="c-card" style={{ background: C.ivory, padding: 24, borderRadius: 12, border: `1px solid ${C.stone}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: C.coral }}></div>
              <div style={{ fontSize: 12, color: C.slate, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Return Loads</div>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "monospace", color: C.ink }}>
                {returnLoadsMatched}
              </div>
            </div>
          </Reveal>
        </div>

        {/* SECTION 5 & 7 — CARGOSYNC PROCESS IMPACT & LATEST OPTIMIZATION */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 24, marginBottom: 32 }}>
          
          <Reveal delay={0.2}>
            <div style={{ background: C.cream, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 24, height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 20 }}>The CargoSync Value Chain</div>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 16, alignItems: isMobile ? "flex-start" : "center", flex: 1 }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>1. Orders</div>
                  <div style={{ fontSize: 12, color: C.slate }}>Consolidate incoming orders into a pool.</div>
                </div>
                {!isMobile && <div style={{ color: C.stone, fontWeight: 700 }}>→</div>}
                
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>2. Clustering</div>
                  <div style={{ fontSize: 12, color: C.slate }}>Group stops by geographic constraints.</div>
                </div>
                {!isMobile && <div style={{ color: C.stone, fontWeight: 700 }}>→</div>}

                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>3. Optimization</div>
                  <div style={{ fontSize: 12, color: C.slate }}>Algorithmically reduce distance required.</div>
                </div>
                {!isMobile && <div style={{ color: C.stone, fontWeight: 700 }}>→</div>}

                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.emerald }}>4. Match & Impact</div>
                  <div style={{ fontSize: 12, color: C.slate }}>Assign return loads, creating value.</div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div style={{ background: C.navy, borderRadius: 12, border: `1px solid ${C.charcoal}`, padding: 24, color: C.ivory, height: "100%" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.peach, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>Latest Optimization</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Run ID</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>{runData.run_id.slice(0, 18)}...</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Status</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.emerald }}>{runData.status}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Routes</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{routes?.length ?? 0} generated</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Savings Context</div>
                  <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                    Based on {metrics?.savings?.comparable_workload_count ?? 0} comparable workloads from baseline.
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => navigate("/app/optimize")}
                style={{ width: "100%", marginTop: 20, padding: "10px", background: "rgba(255,255,255,0.1)", border: `1px solid rgba(255,255,255,0.2)`, borderRadius: 6, color: C.ivory, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
                className="hover-bg-light"
              >
                View Optimization Details
              </button>
            </div>
          </Reveal>
        </div>

        {/* SECTION 3, 4, & 6 — BEFORE vs CARGOSYNC IMPACT, VISUALIZATION, INSIGHTS */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24, marginBottom: 32 }}>
          
          <Reveal delay={0.3}>
            <div style={{ background: C.ivory, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Distance Comparison</div>
                <div style={{ fontSize: 13, color: C.slate }}>Current Operation vs. CargoSync Optimized</div>
              </div>
              
              <div style={{ height: 260, marginBottom: 16 }}>
                {bDist != null && oDist != null ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Current", value: parseFloat((bDist / 1000).toFixed(1)) },
                      { name: "CargoSync", value: parseFloat((oDist / 1000).toFixed(1)) }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.stone} vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tick={{ fill: C.slate }} axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} tick={{ fill: C.slate }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: C.cream }} contentStyle={{ borderRadius: 8, border: `1px solid ${C.stone}`, fontSize: 13, padding: "8px 12px" }} />
                      <Bar dataKey="value" fill={C.coral} radius={[4, 4, 0, 0]} maxBarSize={70} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.slate, fontSize: 13 }}>
                    Distance data unavailable.
                  </div>
                )}
              </div>
              
              {distRedPct != null && (
                <div style={{ padding: 16, background: C.cream, borderRadius: 8, border: `1px solid ${C.stone}` }}>
                  <div style={{ fontSize: 12, color: C.slate, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Operational Insight</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: C.ink }}>
                    CargoSync achieved a <strong style={{ color: C.emerald }}>{distRedPct.toFixed(1)}% reduction</strong> in overall travel distance by optimizing route sequences and vehicle assignments.
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.35}>
            <div style={{ background: C.ivory, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Fleet Utilization</div>
                <div style={{ fontSize: 13, color: C.slate }}>Current Vehicles vs. CargoSync Vehicles</div>
              </div>
              
              <div style={{ height: 260, marginBottom: 16 }}>
                {bVeh != null && oVeh != null ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Current", value: bVeh },
                      { name: "CargoSync", value: oVeh }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.stone} vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tick={{ fill: C.slate }} axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} tick={{ fill: C.slate }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: C.cream }} contentStyle={{ borderRadius: 8, border: `1px solid ${C.stone}`, fontSize: 13, padding: "8px 12px" }} />
                      <Bar dataKey="value" fill={C.navy} radius={[4, 4, 0, 0]} maxBarSize={70} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.slate, fontSize: 13 }}>
                    Vehicle count data unavailable.
                  </div>
                )}
              </div>
              
              {vehRedPct != null && bVeh != null && oVeh != null && (
                <div style={{ padding: 16, background: C.cream, borderRadius: 8, border: `1px solid ${C.stone}` }}>
                  <div style={{ fontSize: 12, color: C.slate, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Operational Insight</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: C.ink }}>
                    By clustering orders efficiently, CargoSync reduced required vehicle dispatches from <strong style={{ color: C.ink }}>{bVeh}</strong> to <strong style={{ color: C.ink }}>{oVeh}</strong>, saving <strong style={{ color: C.emerald }}>{vehRedPct.toFixed(1)}%</strong> in fleet usage.
                  </div>
                </div>
              )}
            </div>
          </Reveal>

        </div>
        
        {/* Style helper for hover button */}
        <style>{`.hover-bg-light:hover { background: rgba(255,255,255,0.15) !important; }`}</style>
      </div>
    );
}

