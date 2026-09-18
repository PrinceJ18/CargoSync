import { C } from "../data/prototype/designTokens";
import { OPERATORS } from "../data/prototype/demoData";

export function NetworkPage() {
  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Operators</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 18 }}>Multi-operator coordination across the Indore network.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {OPERATORS.map((o) => (
          <div key={o.id} style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>{o.name}</div>
            <div style={{ fontSize: 12, color: C.slate, marginBottom: 3 }}>{o.orders} orders · {o.vehicles} vehicles</div>
            <div style={{ height: 5, borderRadius: 3, background: C.stone, marginTop: 10 }}>
              <div style={{ width: `${o.utilization}%`, height: "100%", borderRadius: 3, background: C.coral }} />
            </div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>{o.utilization}% utilization</div>
          </div>
        ))}
      </div>
    </div>
  );
}

