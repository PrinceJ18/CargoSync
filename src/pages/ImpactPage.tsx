import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Settings, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { Panel } from "../components/shared/Panel";
import { Reveal } from "../components/shared/Reveal";
import { useMobile } from "../hooks/useMobile";
import type { OptimizationRunResponse } from "../types/api";

export function ImpactPage() {
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
              <option value="DEMO">Regional Network (Standard)</option>
              <option value="NETWORK">Extended Network (High Volume)</option>
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
            <option value="DEMO">Regional Network (Standard)</option>
            <option value="NETWORK">Extended Network (High Volume)</option>
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

  const distanceData = (bDist != null && oDist != null) ? [
    { name: "Baseline", value: parseFloat((bDist / 1000).toFixed(1)) },
    { name: "Optimized", value: parseFloat((oDist / 1000).toFixed(1)) }
  ] : [];

  const vehicleData = (bVeh != null && oVeh != null) ? [
    { name: "Baseline", value: bVeh },
    { name: "Optimized", value: oVeh }
  ] : [];

  const vehRedPct = (bVeh && bVeh > 0 && oVeh != null) ? ((bVeh - oVeh) / bVeh) * 100 : null;
  const distRedPct = (bDist && bDist > 0 && oDist != null) ? ((bDist - oDist) / bDist) * 100 : null;

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Impact & ROI</div>
        <div style={{ width: 240 }}>
          <select 
            aria-label="Select Scenario"
            value={scenario} 
            onChange={(e) => setScenario(e.target.value)}
            style={{ width: "100%", padding: "6px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 12 }}
          >
            <option value="DEMO">Regional Network (Standard)</option>
            <option value="NETWORK">Extended Network (High Volume)</option>
          </select>
        </div>
      </div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>Operational savings and environmental impact for the {scenario} scenario.</div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Reveal delay={0}><KpiCard label="Distance Saved" value={metrics?.savings?.distance_saved_meters != null ? `${(metrics.savings.distance_saved_meters / 1000).toFixed(1)} km` : "—"} highlight={C.emerald} /></Reveal>
        <Reveal delay={0.05}><KpiCard label="Cost Saved" value={metrics?.savings?.cost_saved_inr != null ? `₹${metrics.savings.cost_saved_inr.toLocaleString()}` : "—"} highlight={C.emerald} /></Reveal>
        <Reveal delay={0.1}><KpiCard label="CO₂ Avoided" value={metrics?.savings?.co2_saved_kg != null ? `${metrics.savings.co2_saved_kg.toFixed(1)} kg` : "—"} highlight={C.emerald} /></Reveal>
        <Reveal delay={0.15}><KpiCard label="Vehicles Reduced" value={vehRedPct != null ? `${vehRedPct.toFixed(1)}%` : "—"} /></Reveal>
        <Reveal delay={0.2}><KpiCard label="Return Loads" value={returnLoadsMatched > 0 ? String(returnLoadsMatched) : "0"} /></Reveal>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20 }}>
        <Reveal delay={0.25}>
        <Panel title="Before vs After — Distance (km)">
          {distanceData.length > 0 ? (
            <div role="img" aria-label={`Bar chart comparing baseline distance ${distanceData[0].value}km and optimized distance ${distanceData[1].value}km`}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.stone} vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tick={{ fill: C.slate }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} tick={{ fill: C.slate }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: C.cream }} contentStyle={{ borderRadius: 6, border: `1px solid ${C.stone}` }} />
                  <Bar dataKey="value" fill={C.coral} radius={[3, 3, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: C.slate, fontSize: 13 }}>
              Distance data unavailable.
            </div>
          )}
          {distRedPct != null && (
            <div style={{ textAlign: "center", fontSize: 12, color: C.slate, marginTop: 8 }}>
              Represents a <strong style={{ color: C.emerald }}>{distRedPct.toFixed(1)}%</strong> reduction in total travel distance.
            </div>
          )}
        </Panel>
        </Reveal>

        <Reveal delay={0.3}>
        <Panel title="Before vs After — Fleet Size (Vehicles)">
          {vehicleData.length > 0 ? (
            <div role="img" aria-label={`Bar chart comparing baseline vehicles ${vehicleData[0].value} and optimized vehicles ${vehicleData[1].value}`}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={vehicleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.stone} vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tick={{ fill: C.slate }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} tick={{ fill: C.slate }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: C.cream }} contentStyle={{ borderRadius: 6, border: `1px solid ${C.stone}` }} />
                  <Bar dataKey="value" fill={C.navy} radius={[3, 3, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: C.slate, fontSize: 13 }}>
              Vehicle count data unavailable.
            </div>
          )}
          {vehRedPct != null && (
            <div style={{ textAlign: "center", fontSize: 12, color: C.slate, marginTop: 8 }}>
              Represents a <strong style={{ color: C.emerald }}>{vehRedPct.toFixed(1)}%</strong> reduction in fleet dispatch.
            </div>
          )}
        </Panel>
        </Reveal>
      </div>

    </div>
  );
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="c-card-hover" style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: "16px 20px" }}>
      <div style={{ fontSize: 11, color: C.slate, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: highlight || C.ink, fontFamily: mono }}>{value}</div>
    </div>
  );
}
