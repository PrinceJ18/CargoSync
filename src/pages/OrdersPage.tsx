import { useState, useEffect, useCallback } from "react";
import { X, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { StatusBadge } from "../components/shared/StatusBadge";
import { Row } from "../components/shared/Row";
import { useAuth } from "../contexts/AuthContext";
import type { Order, PaginatedResponse } from "../types/api";

const PAGE_SIZE = 20;
const ORDER_STATUSES = ["PENDING", "SCHEDULED", "COMPLETED", "FAILED"] as const;

export function OrdersPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Data
  // Data
  const [data, setData] = useState<PaginatedResponse<Order> | null>(null);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [error, setError] = useState<import("../types/api").ApiError | null>(null);

  // Detail
  const [selected, setSelected] = useState<Order | null>(null);

  const fetchOrders = useCallback((pg: number, statusVal?: string) => {
    setFetchStatus("loading");
    setError(null);
    import("../services/apiClient").then(({ api }) => {
      api.orders.list({
        page: pg,
        page_size: PAGE_SIZE,
        status: statusVal || undefined,
      }).then(res => {
        setData(res);
        setFetchStatus("success");
      }).catch((err) => {
        console.error(err);
        setError(err);
        setFetchStatus("error");
      });
    });
  }, []);

  useEffect(() => {
    fetchOrders(page, statusFilter);
  }, [page, statusFilter, fetchOrders]);

  // Client-side search within currently loaded items
  const displayed = data?.items.filter((o) => {
    if (!q) return true;
    const term = q.toLowerCase();
    return (
      (o.reference_number || "").toLowerCase().includes(term) ||
      (o.operator?.name || "").toLowerCase().includes(term) ||
      (o.origin_depot?.name || "").toLowerCase().includes(term) ||
      o.id.toLowerCase().includes(term)
    );
  }) ?? [];

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1); // reset to page 1 on filter change
    setSelected(null);
  };

  const handlePageChange = (newPage: number) => {
    if (!data) return;
    if (newPage < 1 || newPage > data.pages) return;
    setPage(newPage);
    setSelected(null);
  };

  const selectStyle = { padding: "7px 10px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 12.5, background: C.ivory };

  // ─── LOADING ───
  if (fetchStatus === "loading" && !data) {
    return (
      <div style={{ padding: 26, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: C.slate, gap: 10, fontSize: 14 }}>
        <Loader2 size={18} className="spin" /> Loading orders...
      </div>
    );
  }

  // ─── ERROR ───
  if (fetchStatus === "error" && error && !data) {
    const isAuthError = error.code === "UNAUTHORIZED" || error.code === "UNAUTHENTICATED";
    return (
      <div style={{ padding: 26, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
        <AlertCircle size={24} color={C.red} />
        <div style={{ fontSize: 14, color: C.ink }}>{error.message}</div>
        {!isAuthError && (
          <button onClick={() => fetchOrders(1)} style={{ background: C.ink, color: C.ivory, border: "none", padding: "8px 18px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} /> Retry
          </button>
        )}
      </div>
    );
  }

  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div style={{ padding: 26 }}>
      {/* Header */}
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Orders</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 16 }}>
        {isAdmin ? "All network orders" : `${profile?.operator_name || "Operator"} orders`}
        {" · "}{total.toLocaleString()} total{statusFilter ? ` · filtered by ${statusFilter}` : ""}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search reference, operator, depot..."
          value={q} onChange={(e) => setQ(e.target.value)}
          style={{ ...selectStyle, flex: "1 1 220px", minWidth: 200 }}
        />
        <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)} disabled={fetchStatus === "loading"} style={selectStyle}>
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {fetchStatus === "loading" && data && <Loader2 size={14} color={C.slate} className="spin" />}
      </div>

      {/* Table + Detail */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 16 }}>
        <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, overflow: "hidden", position: "relative" }}>
          {fetchStatus === "loading" && data && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(250, 246, 239, 0.6)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={24} color={C.slate} className="spin" />
            </div>
          )}
          {(!data?.items || data.items.length === 0) ? (
            <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: C.slate }}>
              {data?.total === 0 ? (statusFilter ? "No orders match this status." : "No orders available.") : "No orders found on this page."}
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: C.slate }}>
              No orders match your search.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: C.cream, textAlign: "left" }}>
                  {["Reference", "Operator", "Origin Depot", "Destination", "Weight", "Status", "Created"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontWeight: 600, color: C.slate, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((o) => (
                  <tr key={o.id} onClick={() => setSelected(o)} style={{ borderTop: `1px solid ${C.stone}`, cursor: "pointer", background: selected?.id === o.id ? C.cream : "transparent" }}>
                    <td style={{ padding: "10px 14px", fontFamily: mono, fontWeight: 500 }}>{o.reference_number || o.id.slice(0, 8)}</td>
                    <td style={{ padding: "10px 14px" }}>{o.operator?.name || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>{o.origin_depot?.name || "—"}</td>
                    <td style={{ padding: "10px 14px", fontFamily: mono, fontSize: 11 }}>{o.destination_latitude.toFixed(4)}, {o.destination_longitude.toFixed(4)}</td>
                    <td style={{ padding: "10px 14px" }}>{o.weight_kg} kg</td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={o.status} /></td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: C.slate }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: `1px solid ${C.stone}`, fontSize: 12, color: C.slate }}>
              <span>Page {page} of {pages} · {total.toLocaleString()} orders</span>
              <div style={{ display: "flex", gap: 4 }}>
                <PageBtn disabled={page <= 1 || fetchStatus === "loading"} onClick={() => handlePageChange(page - 1)}><ChevronLeft size={14} /></PageBtn>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  let p: number;
                  if (pages <= 7) { p = i + 1; }
                  else if (page <= 4) { p = i + 1; }
                  else if (page >= pages - 3) { p = pages - 6 + i; }
                  else { p = page - 3 + i; }
                  return (
                    <PageBtn key={p} active={p === page} disabled={fetchStatus === "loading"} onClick={() => handlePageChange(p)}>{p}</PageBtn>
                  );
                })}
                <PageBtn disabled={page >= pages || fetchStatus === "loading"} onClick={() => handlePageChange(page + 1)}><ChevronRight size={14} /></PageBtn>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 18, alignSelf: "start", position: "sticky", top: 70 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 14 }}>{selected.reference_number || selected.id.slice(0, 12)}</div>
                <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{selected.operator?.name || "Unknown operator"}</div>
              </div>
              <X size={15} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setSelected(null)} />
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
              <Row l="Status" v={<StatusBadge status={selected.status} />} />
              <Row l="Origin Depot" v={selected.origin_depot?.name || "—"} />
              <Row l="Destination" v={`${selected.destination_latitude.toFixed(4)}, ${selected.destination_longitude.toFixed(4)}`} />
              <Row l="Weight" v={`${selected.weight_kg} kg`} />
              <Row l="Operator" v={selected.operator?.name || "—"} />
              {selected.created_at && <Row l="Created" v={new Date(selected.created_at).toLocaleString()} />}
              {selected.updated_at && <Row l="Updated" v={new Date(selected.updated_at).toLocaleString()} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Pagination button */
function PageBtn({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 4, border: `1px solid ${active ? C.coral : C.stone}`,
        background: active ? C.coral : C.ivory, color: active ? C.ivory : disabled ? C.stone : C.ink,
        fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >{children}</button>
  );
}
