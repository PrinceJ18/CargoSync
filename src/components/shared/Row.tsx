import { C, mono } from "../../data/prototype/designTokens";

export function Row({ l, v, light, coral }: { l: string, v: string | React.ReactNode, light?: boolean, coral?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: light ? "rgba(250,246,239,0.85)" : "#3A3D45" }}>
      <span>{l}</span><span style={{ fontWeight: 700, color: coral ? C.coral : light ? C.ivory : C.ink, fontFamily: mono }}>{v}</span>
    </div>
  );
}

