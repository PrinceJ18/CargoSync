import type { ReactNode } from "react";
import { C } from "../../data/prototype/designTokens";

export function Panel({ title, children }: { title: string, children: ReactNode }) {
  return (
    <div className="c-card-hover" style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: C.ink }}>{title}</div>
      {children}
    </div>
  );
}

