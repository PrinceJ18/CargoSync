import { useState } from "react";
import { C, mono } from "../../data/prototype/designTokens";
import { STAGES } from "../../data/prototype/demoData";

export function ProcessSection() {
  const [active, setActive] = useState("return");
  const stage = STAGES.find((s) => s.k === active) || STAGES[0];
  
  return (
    <div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {STAGES.map((s, i) => (
          <button key={s.k} onClick={() => setActive(s.k)} style={{
            flex: "0 0 auto", padding: "10px 14px", borderRadius: 999, cursor: "pointer",
            border: `1px solid ${active === s.k ? C.coral : C.stone}`,
            background: active === s.k ? C.coral : "transparent",
            color: active === s.k ? C.ivory : C.ink, fontSize: 12.5, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}>
            <span style={{ fontFamily: mono, fontSize: 10.5, opacity: 0.7 }}>{String(i + 1).padStart(2, "0")}</span>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 22, background: C.navy, borderRadius: 6, padding: "28px 30px", color: C.ivory, minHeight: 96 }}>
        <div style={{ fontSize: 12, fontFamily: mono, color: C.peach, marginBottom: 8 }}>{stage.label.toUpperCase()}</div>
        <div style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 560, color: "rgba(250,246,239,0.88)" }}>{stage.detail}</div>
      </div>
    </div>
  );
}

