import type { ReactNode } from "react";
import { C, mono } from "../../data/prototype/designTokens";

interface MetricCardProps {
  icon?: ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function MetricCard({ icon, label, value, sub, accent }: MetricCardProps) {
  return (
    <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: C.slate, fontWeight: 500 }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent ? C.coral : C.ink, fontFamily: mono }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.slate }}>{sub}</div>}
    </div>
  );
}

