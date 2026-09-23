import { C, mono } from "../../data/prototype/designTokens";
import { Reveal } from "../../components/shared/Reveal";
import { useMobile } from "../../hooks/useMobile";

export function ReturnShowcase() {
  const isMobile = useMobile();
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1fr", gap: 40, alignItems: "center" }}>
      <Reveal>
        <div>
        <div style={{ fontFamily: mono, fontSize: 12, color: C.coral, marginBottom: 12 }}>TRK-IND-04 · INDORE → PITHAMPUR</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { label: "Delivery completed", sub: "Cargo dropped at destination" },
            { label: "Remaining capacity", sub: "280 kg available on return leg" },
            { label: "Compatible shipment found", sub: "RL-IND-006 · Pithampur → Indore" },
            { label: "Return load assigned", sub: "Capacity, time, distance and sharing all satisfied" },
          ].map((row, i, arr) => (
            <Reveal key={i} delay={0.1 * i}>
              <div style={{ display: "flex", gap: 14, paddingBottom: i < arr.length - 1 ? 20 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div className={i === 3 ? "node-pulse" : ""} style={{ width: 10, height: 10, borderRadius: "50%", background: i === 3 ? C.coral : C.navy, flexShrink: 0 }} />
                  {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: C.stone, minHeight: 22 }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: C.slate }}>{row.sub}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      </Reveal>
      <Reveal delay={0.2}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="c-card-hover" style={{ background: C.ivory, borderRadius: 6, padding: "18px 20px", border: `1px solid ${C.stone}`, cursor: "default" }}>
          <div style={{ fontSize: 11, fontFamily: mono, color: C.slate, marginBottom: 6 }}>EMPTY RETURN</div>
          <div className="c-icon" style={{ fontSize: 22, fontWeight: 700, color: C.ink, transformOrigin: "left center" }}>36.4 km wasted</div>
          <div style={{ fontSize: 13, color: C.slate }}>Vehicle returns to depot with no cargo</div>
        </div>
        <div className="c-card-hover" style={{ background: C.navy, borderRadius: 6, padding: "18px 20px", border: "1px solid transparent", cursor: "default" }}>
          <div style={{ fontSize: 11, fontFamily: mono, color: C.peach, marginBottom: 6 }}>CARGOSYNC RETURN LOAD</div>
          <div className="c-icon" style={{ fontSize: 22, fontWeight: 700, color: C.ivory, transformOrigin: "left center" }}>+280 kg recovered</div>
          <div style={{ fontSize: 13, color: "rgba(250,246,239,0.7)" }}>Reverse leg monetized, empty km eliminated</div>
        </div>
        </div>
      </Reveal>
    </div>
  );
}

