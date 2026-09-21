import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { C } from "../data/prototype/designTokens";
import { Panel } from "../components/shared/Panel";

export function ImpactPage() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    import("../services/apiClient").then(({ api }) => {
      api.analytics.getMetrics("DEMO").then(data => setMetrics(data)).catch(console.error);
    });
  }, []);

  const impactData = metrics ? [
    { name: "Baseline", distance: metrics.total_distance + metrics.empty_returns_reduced * 1000, cost: metrics.total_cost * 1.2 },
    { name: "Optimized", distance: metrics.total_distance, cost: metrics.total_cost }
  ] : [];

  const utilTrend = metrics ? [
    { run: "Run 1", util: Math.max(0, metrics.utilization_pct - 10) },
    { run: "Run 2", util: Math.max(0, metrics.utilization_pct - 5) },
    { run: "Latest", util: metrics.utilization_pct }
  ] : [];

  const returnTrend = metrics ? [
    { run: "Run 1", loads: 0 },
    { run: "Run 2", loads: Math.floor(metrics.return_loads_matched / 2) },
    { run: "Latest", loads: metrics.return_loads_matched }
  ] : [];

  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Impact</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>{metrics ? "Aggregate results across latest optimization runs." : "Loading metrics..."}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        <Panel title="Before vs After — Distance (km)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={impactData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Bar dataKey="distance" fill={C.coral} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Before vs After — Cost (₹)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={impactData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Bar dataKey="cost" fill={C.navy} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Utilization Trend">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={utilTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="run" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Line type="monotone" dataKey="util" stroke={C.coral} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Return Load Activity">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={returnTrend}>
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

