import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  Package, Truck, MapPin, Route as RouteIcon, RefreshCw,
  AlertCircle, ArrowDownRight, TrendingDown,
  Activity, CheckCircle2, BarChart3
} from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { MetricCard } from "../components/shared/MetricCard";
import { useMobile } from "../hooks/useMobile";
import type {
  OptimizationRunResponse,
  AnalyticsMetricsResponse
} from "../types/api";

/* ─── Helpers ─────────────────────────────────────────────── */
function fmtKm(m: number | null | undefined): string {
  if (m == null || isNaN(m)) return "—";
  return `${(m / 1000).toFixed(1)} km`;
}

function fmtDur(s: number | null | undefined): string {
  if (s == null || isNaN(s)) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function pctChange(baseline: number | undefined | null, optimized: number | undefined | null): string | null {
  if (baseline == null || optimized == null || baseline === 0) return null;
  const pct = ((baseline - optimized) / baseline) * 100;
  if (isNaN(pct) || !isFinite(pct)) return null;
  return pct.toFixed(1);
}

/* ─── Types ───────────────────────────────────────────────── */
interface NetworkTotals {
  orders: number;
  vehicles: number;
  depots: number;
  returnLoads: number;
}

interface OperatorRow {
  id: string;
  name: string;
  orders: number;
  vehicles: number;
  depots: number;
}

/* ─── Component ───────────────────────────────────────────── */
export function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const isMobile = useMobile();

  const [totals, setTotals] = useState<NetworkTotals | null>(null);
  const [runData, setRunData] = useState<OptimizationRunResponse | null>(null);
  const [analyticsMetrics, setAnalyticsMetrics] = useState<AnalyticsMetricsResponse | null>(null);
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [pageError, setPageError] = useState<string | null>(null);

  const scenario = "DEMO";

  const fetchAllData = () => {
    setFetchStatus("loading");
    setPageError(null);

    import("../services/apiClient").then(({ api }) => {
      Promise.all([
        api.orders.list({ scenario, page_size: 500 }),
        api.fleet.listVehicles({ scenario, page_size: 500 }),
        api.fleet.listDepots({ scenario, page_size: 500 }),
        api.returnLoads.list({ scenario, page_size: 500 }),
        api.analytics.getMetrics(scenario),
      ]).then(([ordersRes, vehiclesRes, depotsRes, rlRes, metricsRes]) => {
        setTotals({
          orders: ordersRes.total,
          vehicles: vehiclesRes.total,
          depots: depotsRes.total,
          returnLoads: rlRes.total,
        });
        setAnalyticsMetrics(metricsRes);

        // Derive operator breakdown from orders + vehicles + depots
        const opMap = new Map<string, OperatorRow>();

        const processEntity = (items: any[], field: "orders" | "vehicles" | "depots") => {
          for (const item of items) {
            const opId = item.operator_id || item.operator?.id;
            const opName = item.operator?.name;
            if (!opId) continue;
            if (!opMap.has(opId)) {
              opMap.set(opId, { id: opId, name: opName || opId.slice(0, 8), orders: 0, vehicles: 0, depots: 0 });
            }
            const row = opMap.get(opId)!;
            row[field]++;
            if (opName && row.name === row.id.slice(0, 8)) row.name = opName;
          }
        };
        processEntity(ordersRes.items, "orders");
        processEntity(vehiclesRes.items, "vehicles");
        processEntity(depotsRes.items, "depots");

        setOperators(Array.from(opMap.values()).sort((a, b) => b.orders - a.orders));

        setFetchStatus("success");
      }).catch((err) => {
        console.error("Analytics fetch error:", err);
        setPageError(err.message || "Failed to load analytics data.");
        setFetchStatus("error");
      }).finally(() => {
        // Fetch optimization run separately (may 404)
        api.optimization.getLatest(scenario)
          .then(setRunData)
          .catch((err: any) => {
            if (err.status !== 404 && err.code !== "NOT_FOUND") {
              console.warn("Optimization fetch error:", err);
            }
          });
      });
    });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ─── Derived optimization values ───
  const hasOptimization = runData != null && runData.status === "COMPLETED";
  const metrics = hasOptimization ? runData.metrics : null;
  const routes = hasOptimization ? runData.routes : [];
  const routeCount = routes.length;
  const returnLoadRoutes = routes.filter((r) => r.return_load).length;
  const totalStops = routes.reduce((acc, r) => acc + r.stops.length, 0);
  const uniqueVehicles = new Set(routes.map((r) => r.vehicle_id)).size;

  const bDist = metrics?.baseline?.distance_meters;
  const oDist = metrics?.optimized?.distance_meters;
  const bDur = metrics?.baseline?.duration_seconds;
  const oDur = metrics?.optimized?.duration_seconds;
  const bVeh = metrics?.baseline?.vehicles_used;
  const oVeh = metrics?.optimized?.vehicles_used;

  const distPct = pctChange(bDist, oDist);
  const durPct = pctChange(bDur, oDur);
  const vehPct = pctChange(bVeh, oVeh);

  // ─── Error state ───
  if (fetchStatus === "error") {
    return (
      <div className="fade-in" style={{ padding: 26, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
        <AlertCircle size={24} color={C.coral} />
        <div style={{ fontSize: 14, color: C.ink }}>{pageError}</div>
        <button onClick={fetchAllData} style={{ background: C.ink, color: C.ivory, border: "none", padding: "8px 18px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const isLoading = fetchStatus === "loading";

  // ─── Comparison chart data ───
  const distChartData = (bDist != null && oDist != null) ? [
    { name: "Current Network", value: parseFloat((bDist / 1000).toFixed(1)) },
    { name: "CargoSync Optimized", value: parseFloat((oDist / 1000).toFixed(1)) },
  ] : null;

  const vehChartData = (bVeh != null && oVeh != null) ? [
    { name: "Current Network", value: bVeh },
    { name: "CargoSync Optimized", value: oVeh },
  ] : null;

  return (
    <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", width: "100%", paddingBottom: 60 }}>

      {/* ─── HEADER ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: 8 }}>
            NETWORK ANALYTICS
          </div>
          <div style={{ fontSize: 14.5, color: C.slate, maxWidth: 650, lineHeight: 1.5 }}>
            Network performance intelligence and optimization outcomes across all participating operators.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(30,143,107,0.1)", color: C.emerald, padding: "6px 12px", borderRadius: 999, fontWeight: 600, fontSize: 12, border: "1px solid rgba(30,143,107,0.2)" }}>
          <BarChart3 size={13} />
          ANALYTICS LIVE
        </div>
      </div>

      {/* ─── SECTION 1: NETWORK PERFORMANCE SNAPSHOT ────────── */}
      <div style={{ marginBottom: 32, opacity: isLoading ? 0.6 : 1, transition: "opacity 0.3s" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Network Performance Snapshot</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 16 }}>
          <MetricCard icon={<Package size={16} color={C.navy} />} label="Network Orders" value={totals ? totals.orders.toString() : "—"} sub="Consolidated demand" />
          <MetricCard icon={<Truck size={16} color={C.navy} />} label="Network Vehicles" value={totals ? totals.vehicles.toString() : "—"} sub="Registered fleet" />
          <MetricCard icon={<MapPin size={16} color={C.navy} />} label="Active Hubs" value={totals ? totals.depots.toString() : "—"} sub="Depot locations" />
          <MetricCard icon={<RouteIcon size={16} color={C.coral} />} label="Optimized Routes" value={routeCount.toString()} sub="Generated paths" accent />
          <MetricCard icon={<TrendingDown size={16} color={C.emerald} />} label="Return Load Matches" value={returnLoadRoutes.toString()} sub="Matched backhauls" />
        </div>
      </div>

      {/* ─── SECTION 2: OPTIMIZATION PERFORMANCE ───────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Optimization Performance</div>

        {!hasOptimization ? (
          <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px dashed ${C.stone}`, borderRadius: 8, color: C.slate, background: C.cream, gap: 12 }}>
            <Activity size={20} color={C.slate} />
            <div style={{ fontWeight: 600, fontSize: 14 }}>No optimization results available yet.</div>
            <div style={{ fontSize: 13 }}>Run a network optimization to generate performance analytics.</div>
            <button
              onClick={() => navigate("/app/optimize")}
              style={{ background: C.coral, color: C.ivory, border: "none", padding: "8px 16px", borderRadius: 4, fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 4 }}
            >
              Go to Optimization Center
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20 }}>
            {/* Distance */}
            <ComparisonCard
              title="Total Distance"
              baseline={fmtKm(bDist)}
              optimized={fmtKm(oDist)}
              reduction={distPct}
              baselineLabel="Current Network"
              optimizedLabel="CargoSync Optimized"
            />
            {/* Duration */}
            <ComparisonCard
              title="Total Duration"
              baseline={fmtDur(bDur)}
              optimized={fmtDur(oDur)}
              reduction={durPct}
              baselineLabel="Current Network"
              optimizedLabel="CargoSync Optimized"
            />
            {/* Vehicles */}
            <ComparisonCard
              title="Vehicles Used"
              baseline={bVeh != null ? bVeh.toString() : "—"}
              optimized={oVeh != null ? oVeh.toString() : "—"}
              reduction={vehPct}
              baselineLabel="Current Network"
              optimizedLabel="CargoSync Optimized"
            />
          </div>
        )}
      </div>

      {/* ─── SECTION 3: DISTANCE + FLEET CHARTS ────────────── */}
      {hasOptimization && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* Distance Chart */}
          <div style={{ background: C.ivory, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Distance Comparison</div>
            <div style={{ fontSize: 12, color: C.slate, marginBottom: 20 }}>Current Network vs. CargoSync Optimized (km)</div>
            <div style={{ height: 240 }}>
              {distChartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.stone} vertical={false} />
                    <XAxis dataKey="name" fontSize={11} tick={{ fill: C.slate }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} tick={{ fill: C.slate }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: C.cream }} contentStyle={{ borderRadius: 8, border: `1px solid ${C.stone}`, fontSize: 12, padding: "8px 12px" }} />
                    <Bar dataKey="value" fill={C.coral} radius={[4, 4, 0, 0]} maxBarSize={60} name="Distance (km)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.slate, fontSize: 13 }}>
                  Distance data unavailable.
                </div>
              )}
            </div>
            {distPct && (
              <div style={{ marginTop: 12, padding: 12, background: C.cream, borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
                CargoSync achieved a <strong style={{ color: C.emerald }}>{distPct}% reduction</strong> in total travel distance through optimized routing.
              </div>
            )}
          </div>

          {/* Vehicle Chart */}
          <div style={{ background: C.ivory, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Fleet Utilization</div>
            <div style={{ fontSize: 12, color: C.slate, marginBottom: 20 }}>Vehicles required: Current vs. Optimized</div>
            <div style={{ height: 240 }}>
              {vehChartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vehChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.stone} vertical={false} />
                    <XAxis dataKey="name" fontSize={11} tick={{ fill: C.slate }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} tick={{ fill: C.slate }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: C.cream }} contentStyle={{ borderRadius: 8, border: `1px solid ${C.stone}`, fontSize: 12, padding: "8px 12px" }} />
                    <Bar dataKey="value" fill={C.navy} radius={[4, 4, 0, 0]} maxBarSize={60} name="Vehicles" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.slate, fontSize: 13 }}>
                  Vehicle data unavailable.
                </div>
              )}
            </div>
            {vehPct && bVeh != null && oVeh != null && (
              <div style={{ marginTop: 12, padding: 12, background: C.cream, borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
                Fleet dispatches reduced from <strong>{bVeh}</strong> to <strong>{oVeh}</strong> vehicles — a <strong style={{ color: C.emerald }}>{vehPct}%</strong> reduction.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SECTION 4: NETWORK ROUTE PERFORMANCE ─────────── */}
      {hasOptimization && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Network Route Performance</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16 }}>
            <StatCard label="Total Routes" value={routeCount.toString()} icon={<RouteIcon size={15} color={C.navy} />} />
            <StatCard label="Assigned Vehicles" value={uniqueVehicles.toString()} icon={<Truck size={15} color={C.navy} />} />
            <StatCard label="Total Stops" value={totalStops.toString()} icon={<MapPin size={15} color={C.navy} />} />
            <StatCard label="Routes w/ Return Loads" value={returnLoadRoutes.toString()} icon={<TrendingDown size={15} color={C.emerald} />} />
          </div>
        </div>
      )}

      {/* ─── SECTION 5: RETURN LOAD PERFORMANCE ───────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Return Load Performance</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          <div style={{ background: C.ivory, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Return Load Activity</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: C.slate, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Available Opportunities</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: C.ink }}>{totals ? totals.returnLoads.toString() : "—"}</div>
                <div style={{ fontSize: 11, color: C.slate }}>Registered return loads</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.slate, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Matched to Routes</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: C.emerald }}>{analyticsMetrics?.return_loads_matched ?? returnLoadRoutes}</div>
                <div style={{ fontSize: 11, color: C.slate }}>Assigned via optimization</div>
              </div>
            </div>
          </div>
          <div style={{ background: C.navy, borderRadius: 12, border: `1px solid ${C.charcoal}`, padding: 24, color: C.ivory }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.peach, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>Optimization Summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Latest Run</div>
                <div style={{ fontSize: 13, fontFamily: mono, fontWeight: 600 }}>{runData?.run_id ? runData.run_id.slice(0, 18) + "..." : "No completed run"}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Status</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: hasOptimization ? C.emerald : C.coral }}>{runData?.status ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Routes Generated</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{routeCount}</div>
                </div>
              </div>
              {metrics?.savings && (
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Savings Context</div>
                  <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                    Based on {metrics.savings.comparable_workload_count ?? 0} comparable workloads from baseline analysis.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 6: OPERATOR NETWORK BREAKDOWN ────────── */}
      {operators.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Operator Network Breakdown</div>
          <div style={{ background: C.ivory, borderRadius: 12, border: `1px solid ${C.stone}`, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.stone}` }}>
                    <th style={thStyle}>Operator</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Orders</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Vehicles</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Hubs</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op) => (
                    <tr key={op.id} style={{ borderBottom: `1px solid ${C.stone}` }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: C.ink, fontSize: 13 }}>{op.name}</div>
                        <div style={{ fontSize: 10, fontFamily: mono, color: C.slate }}>{op.id.slice(0, 12)}...</div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{op.orders}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{op.vehicles}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{op.depots}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 7: HISTORICAL NOTE ───────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Historical Trend Analytics</div>
        <div style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px dashed ${C.stone}`, borderRadius: 8, color: C.slate, background: C.cream, gap: 8 }}>
          <BarChart3 size={20} color={C.slate} />
          <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Trend analytics will appear as optimization runs accumulate.</div>
          <div style={{ fontSize: 12, maxWidth: 500, textAlign: "center", lineHeight: 1.5 }}>
            Historical comparisons across multiple optimization runs will be available once sufficient operational data is recorded by the platform.
          </div>
        </div>
      </div>

      {/* ─── SECTION 8: NETWORK SAVINGS SUMMARY ───────────── */}
      {hasOptimization && metrics?.savings && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Network Savings Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16 }}>
            <SavingsCard
              label="Distance Saved"
              value={metrics.savings.distance_saved_meters != null ? `${(metrics.savings.distance_saved_meters / 1000).toFixed(1)} km` : "—"}
              color={C.emerald}
            />
            <SavingsCard
              label="Cost Saved"
              value={metrics.savings.cost_saved_inr != null ? `₹${Math.round(metrics.savings.cost_saved_inr).toLocaleString("en-IN")}` : "—"}
              color={C.coral}
            />
            <SavingsCard
              label="CO₂ Avoided"
              value={metrics.savings.co2_saved_kg != null ? `${Math.round(metrics.savings.co2_saved_kg)} kg` : "—"}
              color={C.emerald}
            />
            <SavingsCard
              label="Comparable Workloads"
              value={metrics.savings.comparable_workload_count?.toString() ?? "—"}
              color={C.navy}
            />
          </div>
        </div>
      )}

    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

function ComparisonCard({ title, baseline, optimized, reduction, baselineLabel, optimizedLabel }: {
  title: string;
  baseline: string;
  optimized: string;
  reduction: string | null;
  baselineLabel: string;
  optimizedLabel: string;
}) {
  return (
    <div style={{ background: C.ivory, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, fontWeight: 600 }}>{baselineLabel}</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: C.ink }}>{baseline}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ArrowDownRight size={14} color={C.emerald} />
          <div style={{ height: 1, flex: 1, background: C.stone }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, fontWeight: 600 }}>{optimizedLabel}</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: C.emerald }}>{optimized}</div>
        </div>
      </div>
      {reduction && (
        <div style={{ padding: "8px 12px", background: "rgba(30,143,107,0.08)", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle2 size={13} color={C.emerald} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.emerald }}>{reduction}% reduction</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: C.ivory, borderRadius: 8, border: `1px solid ${C.stone}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 11, color: C.slate, fontWeight: 500, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: C.ink }}>{value}</div>
      </div>
      {icon}
    </div>
  );
}

function SavingsCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.ivory, borderRadius: 8, border: `1px solid ${C.stone}`, padding: "16px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: color }} />
      <div style={{ fontSize: 11, color: C.slate, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: C.ink }}>{value}</div>
    </div>
  );
}

/* ─── Table styles ────────────────────────────────────────── */
const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 11,
  fontWeight: 600,
  color: C.slate,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
};
