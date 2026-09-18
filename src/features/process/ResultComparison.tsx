import { C, mono } from "../../data/prototype/designTokens";
import { Row } from "../../components/shared/Row";
import { ReturnShowcase } from "./ReturnShowcase";

export function ResultComparison() {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Optimization Result · RUN-2026-0906</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: C.cream, borderRadius: 6, padding: 18, border: `1px solid ${C.stone}` }}>
          <div style={{ fontSize: 11, fontFamily: mono, color: C.slate, marginBottom: 10 }}>BASELINE</div>
          <Row l="Total Distance" v="612 km" />
          <Row l="Vehicles Used" v="19" />
          <Row l="Avg Utilization" v="54%" />
          <Row l="Empty Return KM" v="94 km" />
          <Row l="Cost" v="₹38,400" />
        </div>
        <div style={{ background: C.navy, borderRadius: 6, padding: 18 }}>
          <div style={{ fontSize: 11, fontFamily: mono, color: C.peach, marginBottom: 10 }}>CARGOSYNC</div>
          <Row l="Total Distance" v="471 km" light coral />
          <Row l="Vehicles Used" v="16" light />
          <Row l="Avg Utilization" v="77%" light coral />
          <Row l="Empty Return KM" v="37 km" light coral />
          <Row l="Cost" v="₹27,950" light coral />
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <ReturnShowcase />
      </div>
    </div>
  );
}

