import { useState, useEffect } from "react";
import { C } from "../../../data/prototype/designTokens";

export function ClusterMini() {
  const scattered = [{ x: 6, y: 4 }, { x: 20, y: 6 }, { x: 14, y: 20 }, { x: 30, y: 2 }, { x: 38, y: 14 }, { x: 34, y: 24 }];
  const grouped = [{ x: 10, y: 12 }, { x: 12, y: 10 }, { x: 11, y: 14 }, { x: 34, y: 10 }, { x: 34, y: 14 }, { x: 34, y: 12 }];
  const [on, setOn] = useState(false);
  
  useEffect(() => {
    const iv = setInterval(() => setOn((v) => !v), 1600);
    return () => clearInterval(iv);
  }, []);
  
  const pts = on ? grouped : scattered;
  
  return (
    <svg width="46" height="30" viewBox="0 0 46 30">
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={i < 3 ? C.coral : C.navy} opacity={on ? 1 : 0.7}
          style={{ transition: "cx 0.9s ease, cy 0.9s ease" }} />
      ))}
    </svg>
  );
}

export const RouteMini = () => (
  <svg width="46" height="30" viewBox="0 0 46 30"><path d="M4,24 L18,8 L32,20 L42,6" fill="none" stroke={C.coral} strokeWidth="2" /></svg>
);

export const ReturnMini = () => (
  <svg width="46" height="30" viewBox="0 0 46 30">
    <path d="M4,10 L34,10" stroke={C.coral} strokeWidth="2" markerEnd="url(#a1)" />
    <path d="M34,22 L4,22" stroke={C.slate} strokeWidth="2" />
    <defs><marker id="a1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={C.coral} /></marker></defs>
  </svg>
);

export const SavingsMini = () => (
  <svg width="46" height="30" viewBox="0 0 46 30"><rect x="6" y="6" width="8" height="22" fill={C.slate} opacity="0.4" /><rect x="20" y="14" width="8" height="14" fill={C.coral} /><rect x="34" y="18" width="8" height="10" fill={C.coral} opacity="0.7" /></svg>
);

export const CapacityMini = () => (
  <svg width="46" height="30" viewBox="0 0 46 30"><rect x="4" y="4" width="38" height="22" rx="2" fill="none" stroke={C.slate} strokeWidth="1.5" /><rect x="6" y="14" width="34" height="10" fill={C.coral} opacity="0.75" /></svg>
);

export const NetworkMini = () => (
  <svg width="46" height="30" viewBox="0 0 46 30"><circle cx="8" cy="8" r="2.5" fill={C.slate} /><circle cx="30" cy="6" r="2.5" fill={C.slate} /><circle cx="20" cy="22" r="2.5" fill={C.coral} /><circle cx="40" cy="20" r="2.5" fill={C.slate} /><path d="M8,8 L20,22 L30,6 M20,22 L40,20" stroke={C.slate} strokeWidth="1" opacity="0.5" /></svg>
);

