import { useState, useEffect } from "react";
import { C, mono } from "../data/prototype/designTokens";
import { MetricCard } from "../components/shared/MetricCard";

export function FleetPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("../services/apiClient").then(({ api }) => {
      api.fleet.listVehicles().then(data => {
        setVehicles(data);
        setSel(data[0] || null);
        setLoading(false);
      }).catch(console.error);
    });
  }, []);

  return (
    <div style={{ padding: 26, display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Fleet</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            <div style={{ fontSize: 13, color: C.slate }}>Loading fleet...</div>
          ) : vehicles.map((v) => (
            <div key={v.id} onClick={() => setSel(v)} style={{
              padding: "12px 14px", borderRadius: 6, cursor: "pointer",
              border: `1px solid ${sel?.id === v.id ? C.coral : C.stone}`, background: C.ivory,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600 }}>{v.reference_number || v.id.slice(0, 8)}</span>
                <span style={{ fontSize: 11.5, color: C.slate }}>{v.operator_id?.slice(0, 8)}</span>
              </div>
              <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>Capacity: {v.capacity_kg} kg · Status: {v.status}</div>
            </div>
          ))}
        </div>
      </div>
      {sel && (
        <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 22 }}>
          <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{sel.reference_number || sel.id}</div>
          <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 18 }}>Operator: {sel.operator_id}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <MetricCard label="Capacity" value={`${sel.capacity_kg} kg`} />
            <MetricCard label="Type" value={sel.vehicle_type || "TRUCK"} accent />
            <MetricCard label="Status" value={sel.status} />
            <MetricCard label="Depot ID" value={sel.depot_id?.slice(0, 8) || "—"} />
          </div>
        </div>
      )}
    </div>
  );
}

