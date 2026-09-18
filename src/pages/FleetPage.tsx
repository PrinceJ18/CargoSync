import { useState } from "react";
import { C, mono } from "../data/prototype/designTokens";
import { VEHICLES } from "../data/prototype/demoData";
import { MetricCard } from "../components/shared/MetricCard";

export function FleetPage() {
  const [sel, setSel] = useState(VEHICLES[0]);
  return (
    <div style={{ padding: 26, display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Fleet</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {VEHICLES.map((v) => (
            <div key={v.id} onClick={() => setSel(v)} style={{
              padding: "12px 14px", borderRadius: 6, cursor: "pointer",
              border: `1px solid ${sel.id === v.id ? C.coral : C.stone}`, background: C.ivory,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600 }}>{v.id}</span>
                <span style={{ fontSize: 11.5, color: C.slate }}>{v.operator}</span>
              </div>
              <div style={{ marginTop: 8, height: 5, borderRadius: 3, background: C.stone }}>
                <div style={{ width: `${v.util}%`, height: "100%", borderRadius: 3, background: C.coral }} />
              </div>
              <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>{v.load} / {v.capacity} kg · {v.util}%</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 22 }}>
        <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{sel.id}</div>
        <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 18 }}>{sel.operator} · {sel.stops} stops · {sel.distance} km</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <MetricCard label="Current Load" value={`${sel.load} kg`} />
          <MetricCard label="Utilization" value={`${sel.util}%`} accent />
          <MetricCard label="Distance" value={`${sel.distance} km`} />
          <MetricCard label="Return Load" value={sel.returnLoad} />
        </div>
      </div>
    </div>
  );
}

