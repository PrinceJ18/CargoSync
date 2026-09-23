import { useState, useEffect, useCallback } from "react";
import { X, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { StatusBadge } from "../components/shared/StatusBadge";
import { Row } from "../components/shared/Row";
import { useAuth } from "../contexts/AuthContext";
import { useMobile } from "../hooks/useMobile";
import type { Vehicle, PaginatedResponse } from "../types/api";

const PAGE_SIZE = 20;
const VEHICLE_STATUSES = ["AVAILABLE", "IN_TRANSIT", "MAINTENANCE"] as const;

export function FleetPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scenario, setScenario] = useState("DEMO");

  // Pagination
  const [page, setPage] = useState(1);

  // Data
  const [data, setData] = useState<PaginatedResponse<Vehicle> | null>(null);

  const isMobile = useMobile();

  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [error, setError] = useState<import("../types/api").ApiError | null>(null);

  // Detail
  const [selected, setSelected] = useState<Vehicle | null>(null);

  const fetchVehicles = useCallback((pg: number, statusVal?: string, scenarioVal?: string) => {
    setFetchStatus("loading");
    setError(null);
    import("../services/apiClient").then(({ api }) => {
      api.fleet.listVehicles({
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
    fetchVehicles(page, statusFilter, scenario);
  }, [page, statusFilter, scenario, fetchVehicles]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Client-side search within currently loaded items
  const displayed = data?.items.filter((v) => {
    if (!q) return true;
    const term = q.toLowerCase();
    return (
      (v.reference_number || "").toLowerCase().includes(term) ||
      (v.operator?.name || "").toLowerCase().includes(term) ||
      (v.depot?.name || "").toLowerCase().includes(term) ||
      v.id.toLowerCase().includes(term)
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

  const selectStyle = { padding: "7px 10px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 12.5, background: C.ivory };

  // ─── LOADING ───
  if (fetchStatus === "loading" && !data) {
    return (
      <div style={{ padding: 26, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: C.slate, gap: 10, fontSize: 14 }}>
        <Loader2 size={18} className="spin" /> Loading fleet...
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
          <button onClick={() => fetchVehicles(1)} style={{ background: C.ink, color: C.ivory, border: "none", padding: "8px 18px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
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
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Fleet</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 16 }}>
        {isAdmin ? "All network vehicles" : `${profile?.operator_name || "Operator"} vehicles`}
        {" · "}{total.toLocaleString()} total{statusFilter ? ` · filtered by ${statusFilter}` : ""}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          aria-label="Search fleet"
          placeholder="Search registration, operator, depot..."
          value={q} onChange={(e) => setQ(e.target.value)}
          style={{ ...selectStyle, flex: "1 1 220px", minWidth: 200 }}
        />
        <select aria-label="Filter by status" value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)} disabled={fetchStatus === "loading"} style={selectStyle}>
          <option value="">All Statuses</option>
          {VEHICLE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Select Scenario" value={scenario} onChange={(e) => handleScenarioChange(e.target.value)} disabled={fetchStatus === "loading"} style={selectStyle}>
          <option value="DEMO">DEMO - Regional Network</option>
          <option value="NETWORK">NETWORK - Extended Operations</option>
        </select>
        {fetchStatus === "loading" && data && <Loader2 size={14} color={C.slate} className="spin" aria-hidden="true" />}
      </div>

      {/* Table + Detail */}
      <div style={{ display: isMobile ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: selected && !isMobile ? "1fr 340px" : "1fr", gap: 16 }}>
        <div style={{ flex: 1, background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, overflowX: "auto", position: "relative", minWidth: 0 }}>
          {fetchStatus === "loading" && data && (
            <div role="status" aria-label="Loading fleet" style={{ position: "absolute", inset: 0, background: "rgba(250, 246, 239, 0.6)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={24} color={C.slate} className="spin" aria-hidden="true" />
            </div>
          )}
          {(!data?.items || data.items.length === 0) ? (
            <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: C.slate }}>
              {data?.total === 0 ? (statusFilter ? "No vehicles match this status." : "No vehicles available.") : "No vehicles found on this page."}
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: C.slate }}>
              No vehicles match your search.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: C.cream, textAlign: "left" }}>
                  {["Registration", "Operator", "Depot", "Capacity", "Status"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontWeight: 600, color: C.slate, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((v) => (
                  <tr 
                    key={v.id} 
                    className="c-table-row"
                    onClick={() => setSelected(v)} 
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(v); } }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={selected?.id === v.id}
                    style={{ borderTop: `1px solid ${C.stone}`, cursor: "pointer", background: selected?.id === v.id ? C.cream : "transparent" }}
                  >
                    <td style={{ padding: "10px 14px", fontFamily: mono, fontWeight: 500 }}>{v.reference_number || v.id.slice(0, 8)}</td>
                    <td style={{ padding: "10px 14px" }}>{v.operator?.name || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>{v.depot?.name || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>{v.capacity_kg} kg</td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: `1px solid ${C.stone}`, fontSize: 12, color: C.slate }}>
              <span>Page {page} of {pages} · {total.toLocaleString()} vehicles</span>
              <div style={{ display: "flex", gap: 4 }} role="navigation" aria-label="Pagination">
                <PageBtn aria-label="Previous Page" disabled={page <= 1 || fetchStatus === "loading"} onClick={() => handlePageChange(page - 1)}><ChevronLeft size={14} /></PageBtn>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  let p: number;
                  if (pages <= 7) { p = i + 1; }
                  else if (page <= 4) { p = i + 1; }
                  else if (page >= pages - 3) { p = pages - 6 + i; }
                  else { p = page - 3 + i; }
                  return (
                    <PageBtn aria-label={`Page ${p}`} key={p} active={p === page} disabled={fetchStatus === "loading"} onClick={() => handlePageChange(p)}>{p}</PageBtn>
                  );
                })}
                <PageBtn aria-label="Next Page" disabled={page >= pages || fetchStatus === "loading"} onClick={() => handlePageChange(page + 1)}><ChevronRight size={14} /></PageBtn>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="fade-in" style={
            isMobile
              ? { position: "fixed", inset: 0, zIndex: 100, background: C.ivory, padding: 26, overflowY: "auto", border: "none", borderRadius: 0 }
              : { background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 18, alignSelf: "start", position: "sticky", top: 70 }
          }>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 14 }}>{selected.reference_number || selected.id.slice(0, 12)}</div>
                <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{selected.operator?.name || "Unknown operator"}</div>
              </div>
              <button aria-label="Close details" onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <X size={15} color={C.slate} />
              </button>
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
              <Row l="Status" v={<StatusBadge status={selected.status} />} />
              <Row l="Type" v={selected.vehicle_type || "TRUCK"} />
              <Row l="Capacity" v={`${selected.capacity_kg} kg`} />
              <Row l="Depot" v={selected.depot?.name || "—"} />
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
