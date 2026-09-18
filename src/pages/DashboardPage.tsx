import { useState } from "react";
import { Package, Truck, Gauge, TrendingDown, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { RETURN_LOADS, PIPELINE, OPERATORS } from "../data/prototype/demoData";
import { MetricCard } from "../components/shared/MetricCard";
import { Panel } from "../components/shared/Panel";
import { StatusBadge } from "../components/shared/StatusBadge";
import { NetworkMap } from "../features/map/NetworkMap";

export function DashboardPage() {
  const role = sessionStorage.getItem("cargosync_role") || "operator";
  const [returnLoads, setReturnLoads] = useState(RETURN_LOADS);
  const onAssign = (id: string) => setReturnLoads((prev) => prev.map((r) => r.id === id ? { ...r, status: "ASSIGNED" } : r));
  const isAdmin = role === "admin";
  
  return (
    <div style={{ padding: 26, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
      <div>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{isAdmin ? "Network Overview" : "My Operations"}</div>
            <div style={{ fontSize: 13, color: C.slate }}>{isAdmin ? "Cargo movement across the full Indore network." : "Malwa Express Logistics · Indore network."}</div>
          </div>
          <span style={{ fontSize: 10.5, fontFamily: mono, color: C.slate, border: `1px solid ${C.stone}`, padding: "3px 8px", borderRadius: 999 }}>DEMO DATA</span>
        </div>
        <NetworkMap />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 16 }}>
          <MetricCard icon={<Package size={14} color={C.slate} />} label="Orders" value="119" sub="4 operators" />
          <MetricCard icon={<Truck size={14} color={C.slate} />} label="Vehicles" value="16" sub="active" />
          <MetricCard icon={<Gauge size={14} color={C.slate} />} label="Avg Utilization" value="72%" sub="+6% vs baseline" />
          <MetricCard icon={<TrendingDown size={14} color={C.coral} />} label="Distance Saved" value="141 km" accent />
          <MetricCard icon={<RefreshCw size={14} color={C.slate} />} label="Return Loads" value="8" sub="2 pending" />
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
                <div style={{ fontFamily: mono }}>{r.id}</div>
                {r.reason && <div style={{ fontSize: 10.5, color: C.slate }}>{r.reason}</div>}
              </div>
              {r.status === "CANDIDATE" ? (
                <button onClick={() => onAssign(r.id)} style={{ background: C.coral, color: C.ivory, border: "none", borderRadius: 4, padding: "4px 9px", fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>Assign</button>
              ) : <StatusBadge status={r.status} />}
            </div>
          ))}
        </Panel>
        <Panel title="Operators">
          {OPERATORS.map((o) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12.5 }}>
              <span>{o.name}</span><span style={{ color: C.slate }}>{o.utilization}%</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

