import { useState, useEffect } from "react";
import { Package, Truck, Gauge, TrendingDown, RefreshCw, CheckCircle2, AlertCircle, Loader2, Route, Leaf, IndianRupee } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { MetricCard } from "../components/shared/MetricCard";
import { Panel } from "../components/shared/Panel";
import { Reveal } from "../components/shared/Reveal";
import { StatusBadge } from "../components/shared/StatusBadge";
import { NetworkMap } from "../features/map/NetworkMap";
import { useAuth } from "../contexts/AuthContext";
import { useMobile } from "../hooks/useMobile";
import type { OptimizationRunResponse, AnalyticsMetricsResponse } from "../types/api";

export function DashboardPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const isMobile = useMobile();

  // Entity totals from PaginatedResponse
  const [totals, setTotals] = useState<{ orders: number, fleet: number, depots: number, returnLoads: number } | null>(null);

  // Real API data
  const [metrics, setMetrics] = useState<AnalyticsMetricsResponse | null>(null);
  const [latestRun, setLatestRun] = useState<OptimizationRunResponse | null>(null);
  const [returnLoads, setReturnLoads] = useState<any[] | null>(null);
  const [depots, setDepots] = useState<any[] | null>(null);

  // Loading / error state
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [pageError, setPageError] = useState<string | null>(null);
  const [optError, setOptError] = useState(false);

  const [scenario, setScenario] = useState("DEMO");

  const fetchDashboardData = () => {
    setFetchStatus("loading");
    setPageError(null);
    setOptError(false);
    
    import("../services/apiClient").then(({ api }) => {
      Promise.all([
        api.analytics.getMetrics(scenario),
        api.orders.list({ scenario }),
        api.fleet.listVehicles({ scenario }),
        api.fleet.listDepots({ scenario }),
        api.returnLoads.list({ scenario })
      ]).then(([metricsData, ordersData, fleetData, depotsData, rlData]) => {
        setMetrics(metricsData);
        setTotals({
          orders: ordersData.total,
          fleet: fleetData.total,
          depots: depotsData.total,
          returnLoads: rlData.total
        });
        setDepots(depotsData.items);
        setReturnLoads(rlData.items);
        setFetchStatus("success");
      }).catch(err => {
        console.error("Dashboard core fetch error:", err);
        setPageError(err.message || "Failed to load network overview data.");
        setFetchStatus("error");
      }).finally(() => {
        api.optimization.getLatest(scenario)
          .then(setLatestRun)
          .catch(err => {
            if (err.status !== 404) setOptError(true);
            else setLatestRun(null);
          });
      });
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [scenario]);

  const onAssign = (id: string) => setReturnLoads((prev) => prev ? prev.map((r) => r.id === id ? { ...r, status: "ASSIGNED" } : r) : null);

  // Derived optimization values (null-safe)
  const hasOptimization = latestRun !== null && latestRun.status === "COMPLETED";
  const optMetrics = hasOptimization ? latestRun.metrics : null;
  const routeCount = hasOptimization ? latestRun.routes.length : 0;
  const distSavedKm = optMetrics?.savings ? Math.round(optMetrics.savings.distance_saved_meters / 1000 * 10) / 10 : null;
  const costSaved = optMetrics?.savings?.cost_saved_inr ?? null;
  const co2Saved = optMetrics?.savings?.co2_saved_kg ?? null;

  if (fetchStatus === "error") {
    return (
      <div className="fade-in" style={{ padding: 26, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
        <AlertCircle size={24} color={C.coral} />
        <div style={{ fontSize: 14, color: C.ink }}>{pageError}</div>
        <button onClick={fetchDashboardData} style={{ background: C.ink, color: C.ivory, border: "none", padding: "8px 18px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 26, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr", gap: 20 }}>
      <div>
        <div style={{ marginBottom: 16, display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "baseline" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{isAdmin ? "Network Overview" : "My Operations"}</div>
            <div style={{ fontSize: 13, color: C.slate }}>{isAdmin ? "Cargo movement across the full Indore network." : `${profile?.operator_name || "Operator"} · Indore network.`}</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <select 
              aria-label="Select Scenario"
              value={scenario} 
              onChange={(e) => setScenario(e.target.value)}
              style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 12, background: C.ivory, cursor: "pointer" }}
            >
              <option value="DEMO">DEMO - Regional Network</option>
              <option value="NETWORK">NETWORK - Extended Operations</option>
            </select>
            <span style={{ fontSize: 10.5, fontFamily: mono, color: C.slate, border: `1px solid ${C.stone}`, padding: "3px 8px", borderRadius: 999 }}>LIVE SYSTEM</span>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          {fetchStatus === "loading" && (
            <div className="fade-in" role="status" aria-label="Loading map data" style={{ position: "absolute", inset: 0, background: "rgba(250,246,239,0.5)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={24} color={C.slate} className="spin" aria-hidden="true" />
            </div>
          )}
          <NetworkMap />
        </div>

        {/* Entity KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 12, marginTop: 16, opacity: fetchStatus === "loading" ? 0.6 : 1 }}>
          <Reveal delay={0}><MetricCard icon={<Package size={14} color={C.slate} />} label="Orders" value={totals ? totals.orders.toString() : "\u2014"} sub={totals ? `${totals.depots} depots` : "\u2014"} /></Reveal>
          <Reveal delay={0.05}><MetricCard icon={<Truck size={14} color={C.slate} />} label="Vehicles" value={totals ? totals.fleet.toString() : "\u2014"} sub="active" /></Reveal>
          <Reveal delay={0.1}><MetricCard icon={<Gauge size={14} color={C.slate} />} label="Avg Utilization" value={metrics ? `${metrics.utilization_pct}%` : "\u2014"} /></Reveal>
          <Reveal delay={0.15}><MetricCard icon={<TrendingDown size={14} color={C.coral} />} label="Distance Saved" value={distSavedKm !== null ? `${distSavedKm} km` : "\u2014"} accent /></Reveal>
          <Reveal delay={0.2}><MetricCard icon={<RefreshCw size={14} color={C.slate} />} label="Return Loads" value={totals ? totals.returnLoads.toString() : "\u2014"} /></Reveal>
        </div>

        {/* Optimization Savings — only if real data exists */}
        {hasOptimization && optMetrics?.savings && (
          <Reveal delay={0.25}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
              <MiniStat icon={<Route size={13} color={C.navy} />} label="Routes" value={routeCount.toString()} />
              <MiniStat icon={<TrendingDown size={13} color={C.coral} />} label="Distance Saved" value={distSavedKm !== null ? `${distSavedKm} km` : "\u2014"} />
              <MiniStat icon={<IndianRupee size={13} color={C.emerald} />} label="Cost Saved" value={costSaved !== null ? `\u20B9${Math.round(costSaved).toLocaleString("en-IN")}` : "\u2014"} />
              <MiniStat icon={<Leaf size={13} color={C.emerald} />} label="CO\u2082 Saved" value={co2Saved !== null ? `${co2Saved.toFixed(1)} kg` : "\u2014"} />
            </div>
          </Reveal>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Optimization Status — from real latest run */}
        <Panel title="Optimization Status">
          {optError ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.slate }}>
              <AlertCircle size={13} color={C.amber} /> Unable to load optimization data.
            </div>
          ) : !hasOptimization ? (
            <div style={{ fontSize: 12.5, color: C.slate, padding: "8px 0" }}>
              No optimization run completed yet. Run an optimization from the Optimize page.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <CheckCircle2 size={13} color={C.emerald} />
                <span style={{ fontWeight: 600, color: C.ink }}>Completed</span>
                <span style={{ color: C.slate, marginLeft: "auto", fontSize: 11, fontFamily: mono }}>{latestRun.solver_status || "\u2014"}</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.slate }}>
                {routeCount} route{routeCount !== 1 ? "s" : ""} generated \u00B7 {optMetrics?.savings?.comparable_workload_count ?? 0} orders optimized
              </div>
              {optMetrics && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                  <MiniRow label="Baseline Distance" value={`${(optMetrics.baseline.distance_meters / 1000).toFixed(1)} km`} />
                  <MiniRow label="Optimized Distance" value={`${(optMetrics.optimized.distance_meters / 1000).toFixed(1)} km`} accent />
                  <MiniRow label="Baseline Vehicles" value={optMetrics.baseline.vehicles_used.toString()} />
                  <MiniRow label="Optimized Vehicles" value={optMetrics.optimized.vehicles_used.toString()} accent />
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* Return-Load Opportunities — real API data */}
        <Panel title="Return-Load Opportunities">
          {fetchStatus === "loading" && !returnLoads ? (
            <div role="status" aria-label="Loading return loads" style={{ padding: "20px 0", display: "flex", justifyContent: "center" }}><Loader2 size={16} color={C.slate} className="spin" aria-hidden="true" /></div>
          ) : !returnLoads || returnLoads.length === 0 ? (
            <div role="status" aria-label="No return loads" style={{ fontSize: 12.5, color: C.slate, padding: "8px 0" }}>No return loads in this scenario.</div>
          ) : returnLoads.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.stone}`, fontSize: 12.5 }}>
              <div>
                <div style={{ fontFamily: mono }}>{r.reference_number || r.id.slice(0, 8)}</div>
                {r.operator?.name && <div style={{ fontSize: 10.5, color: C.slate }}>{r.operator.name}</div>}
              </div>
              {r.status === "CANDIDATE" ? (
                <button onClick={() => onAssign(r.id)} style={{ background: C.coral, color: C.ivory, border: "none", borderRadius: 4, padding: "4px 9px", fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>Assign</button>
              ) : <StatusBadge status={r.status} />}
            </div>
          ))}
        </Panel>

        {/* Regional Depots — real API data */}
        <Panel title="Regional Depots">
          {fetchStatus === "loading" && !depots ? (
            <div role="status" aria-label="Loading depots" style={{ padding: "20px 0", display: "flex", justifyContent: "center" }}><Loader2 size={16} color={C.slate} className="spin" aria-hidden="true" /></div>
          ) : !depots || depots.length === 0 ? (
            <div role="status" aria-label="No depots" style={{ fontSize: 12.5, color: C.slate, padding: "8px 0" }}>No depots found.</div>
          ) : depots.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12.5 }}>
              <span>{d.name}</span>
              <span style={{ color: C.slate, fontSize: 11 }}>{d.operator?.name || "Depot"}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

/** Small stat card for optimization savings row */
function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="c-card-hover" style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        {icon}
        <span style={{ fontSize: 10.5, color: C.slate }}>{label}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: C.ink }}>{value}</div>
    </div>
  );
}

/** Compact row for optimization baseline vs optimized comparison */
function MiniRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ fontSize: 11.5, display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: C.slate }}>{label}</span>
      <span style={{ fontFamily: mono, fontWeight: 600, color: accent ? C.coral : C.ink }}>{value}</span>
    </div>
  );
}
