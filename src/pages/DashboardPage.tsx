import { useState, useEffect } from "react";
import { Package, Truck, Gauge, TrendingDown, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { PIPELINE } from "../data/prototype/demoData";
import { MetricCard } from "../components/shared/MetricCard";
import { Panel } from "../components/shared/Panel";
import { StatusBadge } from "../components/shared/StatusBadge";
import { NetworkMap } from "../features/map/NetworkMap";

export function DashboardPage() {
  const role = sessionStorage.getItem("cargosync_role") || "operator";
  const [returnLoads, setReturnLoads] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [depots, setDepots] = useState<any[]>([]);

  useEffect(() => {
    import("../services/apiClient").then(({ api }) => {
      api.analytics.getMetrics("DEMO").then(setMetrics).catch(console.error);
      api.orders.list().then(setOrders).catch(console.error);
      api.fleet.listVehicles().then(setFleet).catch(console.error);
      api.fleet.listDepots().then(setDepots).catch(console.error);
      api.returnLoads.list().then(setReturnLoads).catch(console.error);
    });
  }, []);

  const onAssign = (id: string) => setReturnLoads((prev) => prev.map((r) => r.id === id ? { ...r, status: "ASSIGNED" } : r));
  const isAdmin = role === "admin";
  
  return (
    <div style={{ padding: 26, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
      <div>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{isAdmin ? "Network Overview" : "My Operations"}</div>
            <div style={{ fontSize: 13, color: C.slate }}>{isAdmin ? "Cargo movement across the full Indore network." : "Shree Balaji Logistics · Indore network."}</div>
          </div>
          <span style={{ fontSize: 10.5, fontFamily: mono, color: C.slate, border: `1px solid ${C.stone}`, padding: "3px 8px", borderRadius: 999 }}>LIVE SYSTEM</span>
        </div>
        <NetworkMap />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 16 }}>
          <MetricCard icon={<Package size={14} color={C.slate} />} label="Orders" value={orders.length.toString()} sub={`${depots.length} depots`} />
          <MetricCard icon={<Truck size={14} color={C.slate} />} label="Vehicles" value={fleet.length.toString()} sub="active" />
          <MetricCard icon={<Gauge size={14} color={C.slate} />} label="Avg Utilization" value={metrics ? `${metrics.utilization_pct}%` : "—"} />
          <MetricCard icon={<TrendingDown size={14} color={C.coral} />} label="Distance Saved" value={metrics ? `${metrics.empty_returns_reduced} km` : "—"} accent />
          <MetricCard icon={<RefreshCw size={14} color={C.slate} />} label="Return Loads" value={returnLoads.length.toString()} />
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
                <div style={{ fontFamily: mono }}>{r.reference_number || r.id.slice(0, 8)}</div>
                {r.reason && <div style={{ fontSize: 10.5, color: C.slate }}>{r.reason}</div>}
              </div>
              {r.status === "CANDIDATE" ? (
                <button onClick={() => onAssign(r.id)} style={{ background: C.coral, color: C.ivory, border: "none", borderRadius: 4, padding: "4px 9px", fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>Assign</button>
              ) : <StatusBadge status={r.status} />}
            </div>
          ))}
        </Panel>
        <Panel title="Regional Depots">
          {depots.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12.5 }}>
              <span>{d.name}</span><span style={{ color: C.slate }}>Depot</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

