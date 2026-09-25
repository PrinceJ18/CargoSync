import { useState, useEffect, useCallback } from "react";
import { X, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { StatusBadge } from "../components/shared/StatusBadge";

import { useAuth } from "../contexts/AuthContext";
import { useMobile } from "../hooks/useMobile";
import type { Order, PaginatedResponse } from "../types/api";
import { AdminOrdersPage } from "./AdminOrdersPage";

const PAGE_SIZE = 20;
const ORDER_STATUSES = ["PENDING", "SCHEDULED", "COMPLETED", "FAILED"] as const;

export function OrdersPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  const isMobile = useMobile();

  if (isAdmin) {
    return <AdminOrdersPage />;
  }

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scenario, setScenario] = useState("DEMO");

  // Pagination
  const [page, setPage] = useState(1);

  // Data
  // Data
  const [data, setData] = useState<PaginatedResponse<Order> | null>(null);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [error, setError] = useState<import("../types/api").ApiError | null>(null);

  // Detail
  const [selected, setSelected] = useState<Order | null>(null);

  const fetchOrders = useCallback((pg: number, statusVal?: string, scenarioVal?: string) => {
    setFetchStatus("loading");
    setError(null);
    import("../services/apiClient").then(({ api }) => {
      api.orders.list({
        page: pg,
        page_size: PAGE_SIZE,
        status: statusVal || undefined,
        scenario: scenarioVal,
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
    fetchOrders(page, statusFilter, scenario);
  }, [page, statusFilter, scenario, fetchOrders]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

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

  const handleScenarioChange = (val: string) => {
    setScenario(val);
    setPage(1);
    setSelected(null);
  };

  const handlePageChange = (newPage: number) => {
    if (!data) return;
    if (newPage < 1 || newPage > data.pages) return;
    setPage(newPage);
    setSelected(null);
  };



  // ─── LOADING ───
  if (fetchStatus === "loading" && !data) {
    return (
      <div className="fade-in" style={{ padding: 26, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: C.slate, gap: 10, fontSize: 14 }}>
        <Loader2 size={18} className="spin" /> Loading orders...
      </div>
    );
  }

  // ─── ERROR ───
  if (fetchStatus === "error" && error && !data) {
    const isAuthError = error.code === "UNAUTHORIZED" || error.code === "UNAUTHENTICATED";
    return (
      <div className="fade-in" style={{ padding: 26, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
        <AlertCircle size={24} color={C.coral} />
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
    <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: 8 }}>
              My Orders
            </div>
            <div style={{ fontSize: 14.5, color: C.slate, maxWidth: 650, lineHeight: 1.5 }}>
              Manage delivery demand for your operation. Your orders form the demand layer that CargoSync validates, clusters, and sends into constrained route optimization.
            </div>
          </div>
        </div>
          
          <div style={{ display: "flex", gap: 24, alignItems: "center", borderBottom: `1px solid ${C.stone}`, paddingBottom: 16 }}>
             <div style={{ display: "flex", flexDirection: "column" }}>
               <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Total Orders</span>
               <span style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: C.ink }}>{total.toLocaleString()}</span>
             </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center", background: C.ivory, padding: 12, borderRadius: 8, border: `1px solid ${C.stone}` }}>
          <div style={{ flex: "1 1 240px", minWidth: 200, display: "flex", alignItems: "center", background: C.stone, borderRadius: 6, padding: "0 10px", gap: 8 }}>
             <Search size={14} color={C.slate} />
             <input
               aria-label="Search orders"
               placeholder="Search by Order ID, location..."
               value={q} onChange={(e) => setQ(e.target.value)}
               style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, padding: "8px 0", width: "100%", color: C.ink }}
             />
          </div>
          <select aria-label="Filter by status" value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)} disabled={fetchStatus === "loading"} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 13, background: C.cream, color: C.ink, fontWeight: 500, cursor: "pointer", outline: "none" }}>
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Select Scenario" value={scenario} onChange={(e) => handleScenarioChange(e.target.value)} disabled={fetchStatus === "loading"} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 13, background: C.cream, color: C.ink, fontWeight: 500, cursor: "pointer", outline: "none" }}>
            <option value="DEMO">Indore Regional Operations</option>
            <option value="NETWORK">Extended Network Operations</option>
          </select>
          {fetchStatus === "loading" && data && <Loader2 size={16} color={C.slate} className="spin" aria-hidden="true" style={{ marginLeft: "auto" }} />}
        </div>

        {/* Layout: Table + Side Panel */}
        <div style={{ display: isMobile ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: selected && !isMobile ? "1fr 360px" : "1fr", gap: 20 }}>
          {/* Table Container */}
          <div style={{ flex: 1, background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 8, overflowX: "auto", position: "relative", minWidth: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            {fetchStatus === "loading" && data && (
              <div role="status" aria-label="Loading orders" style={{ position: "absolute", inset: 0, background: "rgba(250, 246, 239, 0.6)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={24} color={C.navy} className="spin" aria-hidden="true" />
              </div>
            )}
            
            {(!data?.items || data.items.length === 0) ? (
              <div className="fade-in" style={{ padding: 40, textAlign: "center", fontSize: 14, color: C.slate }}>
                {data?.total === 0 ? (statusFilter ? "No orders match this status." : "No orders available in this scenario.") : "No orders found on this page."}
              </div>
            ) : displayed.length === 0 ? (
              <div className="fade-in" style={{ padding: 40, textAlign: "center", fontSize: 14, color: C.slate }}>
                No orders match your search criteria.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(27,35,51,0.02)", textAlign: "left", borderBottom: `1px solid ${C.stone}` }}>
                    {["Order ID", "Pickup", "Delivery", "Weight", "Status", "Created"].map((h) => (
                      <th key={h} style={{ padding: "14px 16px", fontWeight: 600, color: C.slate, fontSize: 11.5, letterSpacing: "0.02em", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((o) => (
                    <tr 
                      key={o.id} 
                      className="c-table-row"
                      onClick={() => setSelected(o)} 
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(o); } }}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selected?.id === o.id}
                      style={{ borderBottom: `1px solid ${C.stone}`, cursor: "pointer", background: selected?.id === o.id ? "rgba(30,143,107,0.04)" : "transparent", transition: "background 0.2s" }}
                    >
                      <td style={{ padding: "14px 16px", fontFamily: mono, fontWeight: 600, color: C.ink }}>{o.reference_number || o.id.slice(0, 8)}</td>
                      <td style={{ padding: "14px 16px", color: C.ink }}>{o.origin_depot?.name || "—"}</td>
                      <td style={{ padding: "14px 16px", fontFamily: mono, fontSize: 12, color: C.slate }}>{o.destination_latitude.toFixed(4)}, {o.destination_longitude.toFixed(4)}</td>
                      <td style={{ padding: "14px 16px", color: C.ink }}>{o.weight_kg} kg</td>
                      <td style={{ padding: "14px 16px" }}><StatusBadge status={o.status} /></td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: C.slate }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(27,35,51,0.01)", borderTop: `1px solid ${C.stone}`, fontSize: 12.5, color: C.slate }}>
                <span>Page <strong style={{color:C.ink}}>{page}</strong> of {pages}</span>
                <div style={{ display: "flex", gap: 6 }} role="navigation" aria-label="Pagination">
                  <PageBtn aria-label="Previous Page" disabled={page <= 1 || fetchStatus === "loading"} onClick={() => handlePageChange(page - 1)}><ChevronLeft size={16} /></PageBtn>
                  {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                    let p: number;
                    if (pages <= 5) { p = i + 1; }
                    else if (page <= 3) { p = i + 1; }
                    else if (page >= pages - 2) { p = pages - 4 + i; }
                    else { p = page - 2 + i; }
                    return (
                      <PageBtn aria-label={`Page ${p}`} key={p} active={p === page} disabled={fetchStatus === "loading"} onClick={() => handlePageChange(p)}>{p}</PageBtn>
                    );
                  })}
                  <PageBtn aria-label="Next Page" disabled={page >= pages || fetchStatus === "loading"} onClick={() => handlePageChange(page + 1)}><ChevronRight size={16} /></PageBtn>
                </div>
              </div>
            )}
          </div>

          {/* Business Details Panel */}
          {selected && (
            <div className="fade-in" style={
              isMobile
                ? { position: "fixed", inset: 0, zIndex: 100, background: C.ivory, padding: 24, overflowY: "auto", border: "none", borderRadius: 0 }
                : { background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 8, padding: 24, alignSelf: "start", position: "sticky", top: 80, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }
            }>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Order Details</div>
                  <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 18, color: C.ink }}>{selected.reference_number || selected.id.slice(0, 12)}</div>
                </div>
                <button aria-label="Close details" onClick={() => setSelected(null)} style={{ background: "rgba(27,35,51,0.04)", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={16} color={C.slate} />
                </button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                  <span style={{ fontSize: 13, color: C.slate }}>Status</span>
                  <StatusBadge status={selected.status} />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                   <div>
                     <div style={{ fontSize: 11.5, color: C.slate, marginBottom: 4 }}>Pickup</div>
                     <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{selected.origin_depot?.name || "—"}</div>
                   </div>
                   <div>
                     <div style={{ fontSize: 11.5, color: C.slate, marginBottom: 4 }}>Delivery Coordinates</div>
                     <div style={{ fontSize: 13, fontWeight: 600, fontFamily: mono, color: C.ink }}>{selected.destination_latitude.toFixed(4)}, {selected.destination_longitude.toFixed(4)}</div>
                   </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                   <div>
                     <div style={{ fontSize: 11.5, color: C.slate, marginBottom: 4 }}>Weight</div>
                     <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{selected.weight_kg} kg</div>
                   </div>
                   <div>
                     <div style={{ fontSize: 11.5, color: C.slate, marginBottom: 4 }}>Created</div>
                     <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : "—"}</div>
                   </div>
                </div>
                
                <div>
                   <div style={{ fontSize: 11.5, color: C.slate, marginBottom: 4 }}>System ID</div>
                   <div style={{ fontSize: 12, fontFamily: mono, color: C.slate, wordBreak: "break-all" }}>{selected.id}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }


/** Pagination button */
function PageBtn({ children, active, disabled, onClick, "aria-label": ariaLabel }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void; "aria-label"?: string }) {
  return (
    <button
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
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
