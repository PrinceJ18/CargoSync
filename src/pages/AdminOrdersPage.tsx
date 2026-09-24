import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Search, MapPin, Package, ArrowRight, Route, Clock, CalendarCheck } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { StatusBadge } from "../components/shared/StatusBadge";
import { Panel } from "../components/shared/Panel";
import { MetricCard } from "../components/shared/MetricCard";
import { useMobile } from "../hooks/useMobile";
import type { Order, PaginatedResponse } from "../types/api";

const PAGE_SIZE = 20;
const ORDER_STATUSES = ["PENDING", "SCHEDULED", "COMPLETED", "FAILED"] as const;

function PageBtn({ children, active, disabled, onClick }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? C.ink : "transparent",
        color: active ? C.ivory : C.slate,
        border: `1px solid ${active ? C.ink : C.stone}`,
        borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        fontSize: 12, fontWeight: 600
      }}
    >
      {children}
    </button>
  );
}

export function AdminOrdersPage() {
  const isMobile = useMobile();

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scenario, setScenario] = useState("DEMO");

  // Pagination
  const [page, setPage] = useState(1);

  // Data
  const [data, setData] = useState<PaginatedResponse<Order> | null>(null);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  
  // Metrics
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, scheduled: 0, completed: 0 });

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
        setError("Failed to load orders.");
        setFetchStatus("error");
      });
    });
  }, []);

  const fetchMetrics = useCallback((scenarioVal: string) => {
    import("../services/apiClient").then(({ api }) => {
      Promise.all([
        api.orders.list({ page_size: 1, scenario: scenarioVal }),
        api.orders.list({ page_size: 1, status: "PENDING", scenario: scenarioVal }),
        api.orders.list({ page_size: 1, status: "SCHEDULED", scenario: scenarioVal }),
        api.orders.list({ page_size: 1, status: "COMPLETED", scenario: scenarioVal }),
      ]).then(([allRes, pendingRes, scheduledRes, completedRes]) => {
        setMetrics({
          total: allRes.total,
          pending: pendingRes.total,
          scheduled: scheduledRes.total,
          completed: completedRes.total,
        });
      }).catch(console.error);
    });
  }, []);

  useEffect(() => {
    fetchOrders(page, statusFilter, scenario);
  }, [page, statusFilter, scenario, fetchOrders]);

  useEffect(() => {
    fetchMetrics(scenario);
  }, [scenario, fetchMetrics]);

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

  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 10 }}>
            NETWORK ORDERS
          </div>
          <div style={{ fontSize: 14, color: C.slate, marginTop: 4 }}>
            Manage network-wide delivery demand. These orders form the baseline demand layer that CargoSync validates, clusters, and optimizes.
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(30,143,107,0.1)", color: C.emerald, padding: "6px 12px", borderRadius: 999, fontWeight: 600, fontSize: 12, border: "1px solid rgba(30,143,107,0.2)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald }} />
            NETWORK LIVE
          </div>
        )}
      </div>

      {/* Network Snapshot */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <MetricCard icon={<Package size={16} color={C.navy} />} label="Total Orders" value={metrics.total.toString()} sub="Network-wide demand" />
        <MetricCard icon={<Clock size={16} color={C.navy} />} label="Pending" value={metrics.pending.toString()} sub="Awaiting optimization" />
        <MetricCard icon={<CalendarCheck size={16} color={C.coral} />} label="Scheduled" value={metrics.scheduled.toString()} sub="Routed & assigned" accent />
        <MetricCard icon={<Route size={16} color={C.emerald} />} label="Completed" value={metrics.completed.toString()} sub="Successfully delivered" />
      </div>

      {/* Demand Pipeline */}
      <div style={{ marginBottom: 32, background: C.ivory, padding: 24, borderRadius: 8, border: `1px solid ${C.stone}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.04em" }}>Demand Pipeline</div>
        <div style={{ display: "flex", gap: isMobile ? 8 : 16, alignItems: "center", overflowX: "auto", paddingBottom: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 100 }}>
             <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Demand Intake</div>
             <div style={{ fontSize: 11, color: C.slate }}>Orders from operators</div>
          </div>
          <ArrowRight size={14} color={C.slate} />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 100 }}>
             <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Status Queue</div>
             <div style={{ fontSize: 11, color: C.slate }}>Pending optimization</div>
          </div>
          <ArrowRight size={14} color={C.slate} />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 100 }}>
             <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Optimization</div>
             <div style={{ fontSize: 11, color: C.slate }}>Fleet matching</div>
          </div>
          <ArrowRight size={14} color={C.slate} />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 100 }}>
             <div style={{ fontSize: 12, fontWeight: 600, color: C.emerald }}>Routed</div>
             <div style={{ fontSize: 11, color: C.slate }}>Scheduled for transit</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center", background: C.ivory, padding: 12, borderRadius: 8, border: `1px solid ${C.stone}` }}>
        <div style={{ flex: "1 1 240px", minWidth: 200, display: "flex", alignItems: "center", background: C.stone, borderRadius: 6, padding: "0 10px", gap: 8 }}>
           <Search size={14} color={C.slate} />
           <input
             aria-label="Search orders"
             placeholder="Search by Order ID, operator, location..."
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

      {/* Main Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: (selected && !isMobile) ? "1fr 340px" : "1fr", gap: 24, alignItems: "start" }}>
        
        <Panel title={`NETWORK ORDERS (${total})`}>
          <div style={{ overflowX: "auto", minHeight: 400 }}>
            {fetchStatus === "loading" && !data ? (
              <div style={{ padding: 40, textAlign: "center", color: C.slate, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Loader2 size={16} className="spin" /> Loading orders...
              </div>
            ) : fetchStatus === "error" ? (
              <div style={{ padding: 40, textAlign: "center", color: C.coral, fontSize: 14 }}>
                <AlertCircle size={24} style={{ marginBottom: 8 }} />
                <div>{error}</div>
                <button onClick={() => fetchOrders(page, statusFilter, scenario)} style={{ marginTop: 16, background: C.ink, color: C.ivory, border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>Retry</button>
              </div>
            ) : (!data?.items || data.items.length === 0) ? (
              <div className="fade-in" style={{ padding: 40, textAlign: "center", fontSize: 14, color: C.slate }}>
                {data?.total === 0 ? (statusFilter ? "No orders match this status." : "No orders available in this scenario.") : "No orders found on this page."}
              </div>
            ) : displayed.length === 0 ? (
              <div className="fade-in" style={{ padding: 40, textAlign: "center", fontSize: 14, color: C.slate }}>
                No orders match your search criteria.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.stone}`, fontSize: 11, color: C.slate, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Order ID</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Operator</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Origin</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Destination</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600, textAlign: "right" }}>Weight</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(o => (
                    <tr 
                      key={o.id} 
                      onClick={() => setSelected(o)}
                      className="c-card-hover"
                      style={{ 
                        borderBottom: `1px solid ${C.stone}`, 
                        cursor: "pointer",
                        background: selected?.id === o.id ? C.ivory : "transparent"
                      }}
                    >
                      <td style={{ padding: "16px 20px", fontSize: 13, fontWeight: 600, fontFamily: mono, color: C.ink }}>
                        {o.reference_number || o.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 13, color: C.ink }}>
                        {o.operator?.name || "—"}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 13, color: C.ink }}>
                        {o.origin_depot?.name || "—"}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 12, fontFamily: mono, color: C.slate }}>
                        {o.destination_latitude.toFixed(4)}, {o.destination_longitude.toFixed(4)}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 13, color: C.ink, textAlign: "right" }}>
                        {o.weight_kg} kg
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <StatusBadge status={o.status} />
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 12, color: C.slate }}>
                        {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: `1px solid ${C.stone}`, fontSize: 12.5, color: C.slate }}>
                <span>Page <strong style={{color:C.ink}}>{page}</strong> of {pages}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <PageBtn disabled={page <= 1 || fetchStatus === "loading"} onClick={() => handlePageChange(page - 1)}><ChevronLeft size={16} /></PageBtn>
                  {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                    let p: number;
                    if (pages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= pages - 2) p = pages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <PageBtn key={p} active={p === page} disabled={fetchStatus === "loading"} onClick={() => handlePageChange(p)}>{p}</PageBtn>
                    );
                  })}
                  <PageBtn disabled={page >= pages || fetchStatus === "loading"} onClick={() => handlePageChange(page + 1)}><ChevronRight size={16} /></PageBtn>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Detail Panel */}
        {selected && (
          <div className="fade-in" style={{ position: "sticky", top: 24 }}>
            <Panel title="ORDER DETAILS">
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 4, fontFamily: mono }}>
                      {selected.reference_number || selected.id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: 12, color: C.slate, fontFamily: mono }}>{selected.id}</div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                    <div style={{ fontSize: 13, color: C.slate, display: "flex", alignItems: "center", gap: 8 }}>
                      <MapPin size={14} /> Origin
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{selected.origin_depot?.name || "—"}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                    <div style={{ fontSize: 13, color: C.slate, display: "flex", alignItems: "center", gap: 8 }}>
                      <MapPin size={14} /> Destination
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: mono, color: C.ink }}>
                      {selected.destination_latitude.toFixed(4)}, {selected.destination_longitude.toFixed(4)}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                    <div style={{ fontSize: 13, color: C.slate, display: "flex", alignItems: "center", gap: 8 }}>
                      <Package size={14} /> Weight
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: mono, color: C.ink }}>{selected.weight_kg} kg</div>
                  </div>
                </div>

                <div style={{ background: C.cream, borderRadius: 8, padding: 16, border: `1px solid ${C.stone}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>Operator Context</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.slate, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Name</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{selected.operator?.name || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.slate, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Operator ID</div>
                      <div style={{ fontSize: 12, fontFamily: mono, color: C.slate }}>{selected.operator?.id || "—"}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 24, fontSize: 11, color: C.slate, display: "flex", justifyContent: "space-between" }}>
                  <span>Created: {selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"}</span>
                  <span>Updated: {selected.updated_at ? new Date(selected.updated_at).toLocaleString() : "—"}</span>
                </div>

              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
