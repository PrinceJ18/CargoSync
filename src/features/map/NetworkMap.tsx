import { C, mono } from "../../data/prototype/designTokens";

export function NetworkMap({ compact }: { compact?: boolean }) {
  const depot = { x: 260, y: 200 };
  const stops = [
    { x: 100, y: 90, active: true }, { x: 400, y: 70 }, { x: 460, y: 220, active: true },
    { x: 340, y: 320 }, { x: 130, y: 300 }, { x: 60, y: 200 },
  ];
  return (
    <svg className="c-card-hover" viewBox="0 0 520 380" style={{ width: "100%", height: compact ? 260 : 420, background: C.cream, borderRadius: 6, border: `1px solid ${C.stone}` }}>
      <rect x="0" y="0" width="520" height="380" fill={C.cream} rx="6" />
      {stops.map((s, i) => (
        <line key={i} x1={depot.x} y1={depot.y} x2={s.x} y2={s.y} stroke={s.active ? C.coral : C.stone} strokeWidth={s.active ? 2 : 1} strokeDasharray={s.active ? "0" : "4 4"} />
      ))}
      <circle cx={depot.x} cy={depot.y} r="8" fill={C.navy} />
      <text x={depot.x + 12} y={depot.y + 4} fontSize="10" fontFamily={mono} fill={C.navy}>DEPOT</text>
      {stops.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r="5.5" fill={s.active ? C.coral : C.ivory} stroke={C.slate} strokeWidth="1" />
      ))}
      <circle cx="330" cy="140" r="4" fill={C.emerald}>
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

