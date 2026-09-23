import { useState } from "react";
import { C, mono } from "../../data/prototype/designTokens";

export function BeforeAfterToggle() {
  const [after, setAfter] = useState(false);
  
  return (
    <div>
      <div style={{ display: "inline-flex", border: `1px solid ${C.stone}`, borderRadius: 999, padding: 3, marginBottom: 22 }}>
        {["Before", "After"].map((l, i) => (
          <button key={l} onClick={() => setAfter(i === 1)} style={{
            border: "none", borderRadius: 999, padding: "8px 18px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            background: (i === 1) === after ? C.ink : "transparent", color: (i === 1) === after ? C.ivory : C.slate,
          }}>{l}</button>
        ))}
      </div>
      <div style={{ background: after ? C.navy : C.cream, borderRadius: 6, padding: "34px 30px", transition: "background 0.5s ease", minHeight: 220 }}>
        <div key={after ? 'after' : 'before'} className="fade-in">
          {!after ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {["Operator A", "Operator B", "Operator C"].map((name, i) => (
                <div key={name} className="c-card-hover" style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 4, padding: "16px", cursor: "default" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{name}</div>
                  <svg width="100%" height="46" viewBox="0 0 140 46">
                    <path d={`M8,${36 - i * 4} L70,${10 + i * 6} L132,${30 - i * 3}`} fill="none" stroke={C.slate} strokeWidth="2" strokeDasharray="5 4" />
                  </svg>
                  <div style={{ fontSize: 11.5, color: C.slate, marginTop: 6 }}>Independent route · empty return</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ color: C.ivory, fontSize: 13.5, fontWeight: 600 }}>CargoSync — one coordinated network</div>
              <svg width="100%" height="120" viewBox="0 0 640 120">
                <circle cx="40" cy="60" r="7" fill={C.coral} />
                {[{ x: 210, y: 30 }, { x: 340, y: 70 }, { x: 470, y: 40 }, { x: 560, y: 90 }].map((p, i) => (
                  <g key={i}>
                    <line x1="40" y1="60" x2={p.x} y2={p.y} stroke={C.coral} strokeWidth="1.6" opacity="0.5" strokeDasharray="4" className="route-flow" />
                    <circle cx={p.x} cy={p.y} r="5" fill={C.peach} />
                  </g>
                ))}
                <line x1="560" y1="90" x2="40" y2="60" stroke={C.coral} strokeWidth="1.6" strokeDasharray="4 4" opacity="0.8" className="route-flow" />
              </svg>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                {["Demand consolidated", "Capacity shared", "Return leg filled"].map((t) => (
                  <span key={t} style={{ fontSize: 12, fontFamily: mono, color: C.peach }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

