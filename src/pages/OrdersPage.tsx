import { useState } from "react";
import { X } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { ORDERS } from "../data/prototype/demoData";
import { StatusBadge } from "../components/shared/StatusBadge";
import { Row } from "../components/shared/Row";

export function OrdersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [returnOnly, setReturnOnly] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const filtered = ORDERS.filter((o) => {
    if (q && !(`${o.id} ${o.customer} ${o.operator}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (status !== "All" && o.status !== status) return false;
    if (priority !== "All" && o.priority !== priority) return false;
    if (returnOnly && !o.returnEligible) return false;
    return true;
  });

  const selectStyle = { padding: "7px 10px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 12.5, background: C.ivory };

  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Orders</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 16 }}>{filtered.length} of {ORDERS.length} orders shown.</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="Search order, customer, operator" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ ...selectStyle, flex: "1 1 220px", minWidth: 200 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
          {["All", "Pending", "In Transit", "Delivered"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={selectStyle}>
          {["All", "High", "Normal", "Low"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.slate, cursor: "pointer" }}>
          <input type="checkbox" checked={returnOnly} onChange={(e) => setReturnOnly(e.target.checked)} />
          Return eligible only
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap: 16 }}>
        <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: C.slate }}>No orders match the current filters.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: C.cream, textAlign: "left" }}>
                  {["Order ID", "Operator", "Customer", "Pickup", "Delivery", "Weight", "Priority", "Status", "Return"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontWeight: 600, color: C.slate, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} onClick={() => setSelected(o)} style={{ borderTop: `1px solid ${C.stone}`, cursor: "pointer", background: selected?.id === o.id ? C.cream : "transparent" }}>
                    <td style={{ padding: "10px 14px", fontFamily: mono }}>{o.id}</td>
                    <td style={{ padding: "10px 14px" }}>{o.operator}</td>
                    <td style={{ padding: "10px 14px" }}>{o.customer}</td>
                    <td style={{ padding: "10px 14px" }}>{o.pickup}</td>
                    <td style={{ padding: "10px 14px" }}>{o.delivery}</td>
                    <td style={{ padding: "10px 14px" }}>{o.weight} kg</td>
                    <td style={{ padding: "10px 14px" }}>{o.priority}</td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={o.status} /></td>
                    <td style={{ padding: "10px 14px" }}>{o.returnEligible ? "Yes" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {selected && (
          <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 14 }}>{selected.id}</div>
              <X size={15} style={{ cursor: "pointer" }} onClick={() => setSelected(null)} />
            </div>
            <div style={{ fontSize: 12.5, color: C.slate, marginTop: 4 }}>{selected.customer} · {selected.operator}</div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
              <Row l="Pickup" v={selected.pickup} />
              <Row l="Delivery" v={selected.delivery} />
              <Row l="Weight" v={`${selected.weight} kg`} />
              <Row l="Priority" v={selected.priority} />
              <Row l="Return eligible" v={selected.returnEligible ? "Yes" : "No"} />
            </div>
            <button style={{ marginTop: 14, width: "100%", background: C.ink, color: C.ivory, border: "none", padding: "9px", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              View on map
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

