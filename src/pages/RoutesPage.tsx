import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import { C } from "../data/prototype/designTokens";
import { ROUTE_STOPS } from "../data/prototype/demoData";
import { Panel } from "../components/shared/Panel";
import { Row } from "../components/shared/Row";

export function RoutesPage() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;
    if (idx >= ROUTE_STOPS.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setIdx((v) => v + 1), 900 / speed);
    return () => clearTimeout(t);
  }, [playing, idx, speed]);

  const current = ROUTE_STOPS[idx];
  const capacity = 1200;

  return (
    <div style={{ padding: 26, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Route Intelligence</div>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 14 }}>TRK-IND-04 · Malwa Express Logistics</div>
        <svg viewBox="0 0 520 380" style={{ width: "100%", height: 340, background: C.cream, borderRadius: 6 }}>
          <path d={`M${ROUTE_STOPS.map((s) => `${s.x},${s.y}`).join(" L")}`} fill="none" stroke={C.stone} strokeWidth="2" />
          <path d={`M${ROUTE_STOPS.slice(0, idx + 1).map((s) => `${s.x},${s.y}`).join(" L")}`} fill="none" stroke={C.coral} strokeWidth="2.5" />
          {ROUTE_STOPS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={i === idx ? 8 : 5} fill={i <= idx ? C.coral : C.ivory} stroke={C.navy} strokeWidth="1.2" />
          ))}
        </svg>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
          <button onClick={() => setPlaying(!playing)} style={{ background: C.ink, color: C.ivory, border: "none", padding: "10px 18px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <Play size={13} /> {playing ? "Pause" : idx > 0 ? "Resume" : "Play Route"}
          </button>
          <button onClick={() => { setIdx(0); setPlaying(false); }} style={{ background: "transparent", border: `1px solid ${C.stone}`, padding: "10px 14px", borderRadius: 4, fontSize: 13, cursor: "pointer" }}>Restart</button>
          {[1, 2, 4].map((s) => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              border: `1px solid ${speed === s ? C.coral : C.stone}`, background: speed === s ? C.coral : "transparent",
              color: speed === s ? C.ivory : C.ink, borderRadius: 4, padding: "8px 12px", fontSize: 12, cursor: "pointer",
            }}>{s}×</button>
          ))}
        </div>
      </div>
      <div>
        <Panel title="Route Timeline">
          {ROUTE_STOPS.map((s, i, arr) => (
            <div key={i} style={{ display: "flex", gap: 10, paddingBottom: i < arr.length - 1 ? 10 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: i === idx ? C.coral : i < idx ? C.navy : C.stone }} />
                {i < arr.length - 1 && <div style={{ width: 1, height: 16, background: C.stone }} />}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: i === idx ? 600 : 400, color: s.id === "Return Load" ? C.coral : C.ink }}>{s.id}</span>
            </div>
          ))}
        </Panel>
        <div style={{ marginTop: 14 }}>
          <Panel title="Live Vehicle State">
            <Row l="Current stop" v={current.id} />
            <Row l="Load" v={`${current.loadAfter} / ${capacity} kg`} />
            <Row l="Utilization" v={`${Math.round((current.loadAfter / capacity) * 100)}%`} />
            <Row l="ETA next stop" v={idx < ROUTE_STOPS.length - 1 ? `${(idx + 1) * 6} min` : "Arrived"} />
          </Panel>
        </div>
      </div>
    </div>
  );
}


