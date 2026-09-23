import { useState } from "react";
import { C, mono } from "../../data/prototype/designTokens";
import { STAGES } from "../../data/prototype/demoData";
import { Reveal } from "../../components/shared/Reveal";

export function ProcessSection() {
  const [active, setActive] = useState("return");
  const stage = STAGES.find((s) => s.k === active) || STAGES[0];
  
  return (
    <div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {STAGES.map((s, i) => (
          <Reveal key={s.k} delay={i * 0.08}>
            <button className="c-btn-hover" onClick={() => setActive(s.k)} style={{
              flex: "0 0 auto", padding: "10px 14px", borderRadius: 999, cursor: "pointer",
              border: `1px solid ${active === s.k ? C.coral : C.stone}`,
              background: active === s.k ? C.coral : "transparent",
              color: active === s.k ? C.ivory : C.ink, fontSize: 12.5, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: active === s.k ? "translateY(-2px)" : "none",
              boxShadow: active === s.k ? "0 4px 12px rgba(232, 84, 46, 0.25)" : "none",
            }}>
              <span style={{ fontFamily: mono, fontSize: 10.5, opacity: 0.7 }}>{String(i + 1).padStart(2, "0")}</span>
              {s.label}
            </button>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.4}>
        <div style={{ marginTop: 22, background: C.navy, borderRadius: 6, padding: "28px 30px", color: C.ivory, minHeight: 110 }}>
          <div key={active} className="fade-in">
            <div style={{ fontSize: 12, fontFamily: mono, color: C.peach, marginBottom: 8 }}>{stage.label.toUpperCase()}</div>
            <div style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 560, color: "rgba(250,246,239,0.88)" }}>{stage.detail}</div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

