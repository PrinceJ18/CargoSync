import { C } from "../../data/prototype/designTokens";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string, c: string }> = {
    ASSIGNED: { bg: "rgba(30,143,107,0.12)", c: C.emerald },
    REJECTED: { bg: "rgba(232,84,46,0.1)", c: C.coral },
    PENDING: { bg: "rgba(201,138,27,0.12)", c: C.amber },
    SCHEDULED: { bg: "rgba(27,35,51,0.1)", c: C.navy },
    COMPLETED: { bg: "rgba(30,143,107,0.12)", c: C.emerald },
    FAILED: { bg: "rgba(232,84,46,0.1)", c: C.coral },
    AVAILABLE: { bg: "rgba(30,143,107,0.12)", c: C.emerald },
    IN_TRANSIT: { bg: "rgba(27,35,51,0.1)", c: C.navy },
    MAINTENANCE: { bg: "rgba(232,84,46,0.1)", c: C.coral },
    "In Transit": { bg: "rgba(201,138,27,0.12)", c: C.amber },
    Delivered: { bg: "rgba(30,143,107,0.12)", c: C.emerald },
    Pending: { bg: "rgba(138,141,150,0.14)", c: C.slate },
  };
  const s = map[status] || { bg: C.stone, c: C.slate };
  return <span style={{ fontSize: 10.5, fontWeight: 600, background: s.bg, color: s.c, padding: "3px 8px", borderRadius: 999, border: `1px solid ${s.c}33` }}>{status}</span>;
}

