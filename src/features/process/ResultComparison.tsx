import { C, mono } from "../../data/prototype/designTokens";
import { Row } from "../../components/shared/Row";
import { Reveal } from "../../components/shared/Reveal";
import type { OptimizationRunResponse } from "../../types/api";

export function ResultComparison({ result }: { result: OptimizationRunResponse }) {
  const m = result.metrics;
  if (!m) return (
    <div style={{ padding: 20, color: C.slate, fontSize: 13, background: C.cream, borderRadius: 6, border: `1px solid ${C.stone}` }}>
      No metrics available for this result.
    </div>
  );

  // Compute matched return loads from the actual route output as it's missing in aggregated metrics
  const matchedReturnLoads = result.routes?.filter(r => r.return_load).length || 0;

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Optimization Metrics</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Reveal delay={0.1}>
          <div className="c-card-hover" style={{ background: C.cream, borderRadius: 6, padding: 18, border: `1px solid ${C.stone}`, height: "100%" }}>
            <div style={{ fontSize: 11, fontFamily: mono, color: C.slate, marginBottom: 10 }}>BASELINE</div>
            <Row l="Total Distance" v={m.baseline?.distance_meters != null ? `${(m.baseline.distance_meters / 1000).toFixed(1)} km` : "Not available"} />
            <Row l="Vehicles Used" v={m.baseline?.vehicles_used?.toString() || "Not available"} />
            <Row l="Total Duration" v={m.baseline?.duration_seconds != null ? `${(m.baseline.duration_seconds / 3600).toFixed(1)} hrs` : "Not available"} />
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="c-card-hover" style={{ background: C.navy, borderRadius: 6, padding: 18, border: `1px solid ${C.charcoal}`, height: "100%" }}>
            <div style={{ fontSize: 11, fontFamily: mono, color: C.peach, marginBottom: 10 }}>CARGOSYNC OPTIMIZED</div>
            <Row l="Total Distance" v={m.optimized?.distance_meters != null ? `${(m.optimized.distance_meters / 1000).toFixed(1)} km` : "Not available"} light coral />
            <Row l="Vehicles Used" v={m.optimized?.vehicles_used?.toString() || "Not available"} light />
            <Row l="Total Duration" v={m.optimized?.duration_seconds != null ? `${(m.optimized.duration_seconds / 3600).toFixed(1)} hrs` : "Not available"} light />
          </div>
        </Reveal>
      </div>
      
      <Reveal delay={0.3}>
        <div className="c-card-hover" style={{ marginTop: 20, background: C.ivory, borderRadius: 6, padding: 18, border: `1px solid ${C.stone}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12 }}>Savings & Operational Impact</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: C.slate, fontFamily: mono }}>Distance Saved</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.emerald }}>
                {m.savings?.distance_saved_meters != null ? `${(m.savings.distance_saved_meters / 1000).toFixed(1)} km` : "Not available"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: C.slate, fontFamily: mono }}>Cost Saved</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.emerald }}>
                {m.savings?.cost_saved_inr != null ? `₹${Math.round(m.savings.cost_saved_inr).toLocaleString()}` : "Not available"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: C.slate, fontFamily: mono }}>CO₂ Avoided</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.emerald }}>
                {m.savings?.co2_saved_kg != null ? `${m.savings.co2_saved_kg.toFixed(1)} kg` : "Not available"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: C.slate, fontFamily: mono }}>Return Loads</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.coral }}>
                {matchedReturnLoads}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: C.slate, fontFamily: mono }}>Comparable Workload</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>
                {m.savings?.comparable_workload_count != null ? m.savings.comparable_workload_count : "Not available"}
              </span>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

