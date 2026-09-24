import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Search, Truck, MapPin, CheckCircle2, Navigation, PenTool, ArrowRight } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { StatusBadge } from "../components/shared/StatusBadge";
import { Panel } from "../components/shared/Panel";
import { MetricCard } from "../components/shared/MetricCard";
import { useMobile } from "../hooks/useMobile";
import type { Vehicle, PaginatedResponse } from "../types/api";

const PAGE_SIZE = 20;
const VEHICLE_STATUSES = ["AVAILABLE", "IN_TRANSIT", "MAINTENANCE"] as const;

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

export function AdminVehiclesPage() {
  const isMobile = useMobile();

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scenario, setScenario] = useState("DEMO");

  // Pagination
  const [page, setPage] = useState(1);

  // Data
  const [data, setData] = useState<PaginatedResponse<Vehicle> | null>(null);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  
  // Metrics
  const [metrics, setMetrics] = useState({ total: 0, available: 0, intransit: 0, maintenance: 0 });

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
        setError("Failed to load network vehicles.");
        setFetchStatus("error");
      });
    });
  }, []);

  const fetchMetrics = useCallback((scenarioVal: string) => {
    import("../services/apiClient").then(({ api }) => {
      Promise.all([
        api.fleet.listVehicles({ page_size: 1, scenario: scenarioVal }),
        api.fleet.listVehicles({ page_size: 1, status: "AVAILABLE", scenario: scenarioVal }),
        api.fleet.listVehicles({ page_size: 1, status: "IN_TRANSIT", scenario: scenarioVal }),
        api.fleet.listVehicles({ page_size: 1, status: "MAINTENANCE", scenario: scenarioVal }),
      ]).then(([allRes, availRes, transRes, maintRes]) => {
        setMetrics({
          total: allRes.total,
          available: availRes.total,
          intransit: transRes.total,
          maintenance: maintRes.total,
        });
      }).catch(console.error);
    });
  }, []);

  useEffect(() => {
    fetchVehicles(page, statusFilter, scenario);
  }, [page, statusFilter, scenario, fetchVehicles]);

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

  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 10 }}>
            NETWORK VEHICLES
          </div>
          <div style={{ fontSize: 14, color: C.slate, marginTop: 4 }}>
            Manage the vehicles and capacity across the entire CargoSync network.
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
        <MetricCard icon={<Truck size={16} color={C.navy} />} label="Total Vehicles" value={metrics.total.toString()} sub="Network-wide fleet" />
        <MetricCard icon={<CheckCircle2 size={16} color={C.emerald} />} label="Available" value={metrics.available.toString()} sub="Ready for routing" accent />
        <MetricCard icon={<Navigation size={16} color={C.navy} />} label="In Transit" value={metrics.intransit.toString()} sub="Executing routes" />
        <MetricCard icon={<PenTool size={16} color={C.coral} />} label="Maintenance" value={metrics.maintenance.toString()} sub="Out of service" />
      </div>

      {/* Fleet Pipeline */}
      <div style={{ marginBottom: 32, background: C.ivory, padding: 24, borderRadius: 8, border: `1px solid ${C.stone}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.04em" }}>Fleet Pipeline</div>
        <div style={{ display: "flex", gap: isMobile ? 8 : 16, alignItems: "center", overflowX: "auto", paddingBottom: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 100 }}>
             <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Operators</div>
             <div style={{ fontSize: 11, color: C.slate }}>Register fleet</div>
          </div>
          <ArrowRight size={14} color={C.slate} />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 110 }}>
             <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Registered Vehicles</div>
             <div style={{ fontSize: 11, color: C.slate }}>Added to network</div>
          </div>
          <ArrowRight size={14} color={C.slate} />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 100 }}>
             <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Available Capacity</div>
             <div style={{ fontSize: 11, color: C.slate }}>Idle at depots</div>
          </div>
          <ArrowRight size={14} color={C.slate} />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 100 }}>
             <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Optimization</div>
             <div style={{ fontSize: 11, color: C.slate }}>Matched to orders</div>
          </div>
          <ArrowRight size={14} color={C.slate} />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 100 }}>
             <div style={{ fontSize: 12, fontWeight: 600, color: C.emerald }}>Routes</div>
             <div style={{ fontSize: 11, color: C.slate }}>Dispatched fleet</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center", background: C.ivory, padding: 12, borderRadius: 8, border: `1px solid ${C.stone}` }}>
        <div style={{ flex: "1 1 240px", minWidth: 200, display: "flex", alignItems: "center", background: C.stone, borderRadius: 6, padding: "0 10px", gap: 8 }}>
           <Search size={14} color={C.slate} />
           <input
             aria-label="Search vehicles"
             placeholder="Search by Vehicle ID, operator, depot..."
             value={q} onChange={(e) => setQ(e.target.value)}
             style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, padding: "8px 0", width: "100%", color: C.ink }}
           />
        </div>
        <select aria-label="Filter by status" value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)} disabled={fetchStatus === "loading"} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 13, background: C.cream, color: C.ink, fontWeight: 500, cursor: "pointer", outline: "none" }}>
          <option value="">All Statuses</option>
          {VEHICLE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Select Scenario" value={scenario} onChange={(e) => handleScenarioChange(e.target.value)} disabled={fetchStatus === "loading"} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 13, background: C.cream, color: C.ink, fontWeight: 500, cursor: "pointer", outline: "none" }}>
          <option value="DEMO">Indore Regional Operations</option>
          <option value="NETWORK">Extended Network Operations</option>
        </select>
        {fetchStatus === "loading" && data && <Loader2 size={16} color={C.slate} className="spin" aria-hidden="true" style={{ marginLeft: "auto" }} />}
      </div>

      {/* Main Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: (selected && !isMobile) ? "1fr 340px" : "1fr", gap: 24, alignItems: "start" }}>
        
        <Panel title={`NETWORK VEHICLES (${total})`}>
          <div style={{ overflowX: "auto", minHeight: 400 }}>
            {fetchStatus === "loading" && !data ? (
              <div style={{ padding: 40, textAlign: "center", color: C.slate, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Loader2 size={16} className="spin" /> Loading fleet...
              </div>
            ) : fetchStatus === "error" ? (
              <div style={{ padding: 40, textAlign: "center", color: C.coral, fontSize: 14 }}>
                <AlertCircle size={24} style={{ marginBottom: 8 }} />
                <div>{error}</div>
                <button onClick={() => fetchVehicles(page, statusFilter, scenario)} style={{ marginTop: 16, background: C.ink, color: C.ivory, border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>Retry</button>
              </div>
            ) : (!data?.items || data.items.length === 0) ? (
              <div className="fade-in" style={{ padding: 40, textAlign: "center", fontSize: 14, color: C.slate }}>
                {data?.total === 0 ? (statusFilter ? "No vehicles match this status." : "No vehicles available in this scenario.") : "No vehicles found on this page."}
              </div>
            ) : displayed.length === 0 ? (
              <div className="fade-in" style={{ padding: 40, textAlign: "center", fontSize: 14, color: C.slate }}>
                No vehicles match your search criteria.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.stone}`, fontSize: 11, color: C.slate, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Vehicle</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Operator</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Type</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600, textAlign: "right" }}>Capacity</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Depot</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(v => (
                    <tr 
                      key={v.id} 
                      onClick={() => setSelected(v)}
                      className="c-card-hover"
                      style={{ 
                        borderBottom: `1px solid ${C.stone}`, 
                        cursor: "pointer",
                        background: selected?.id === v.id ? C.ivory : "transparent"
                      }}
                    >
                      <td style={{ padding: "16px 20px", fontSize: 13, fontWeight: 600, fontFamily: mono, color: C.ink }}>
                        {v.reference_number || v.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 13, color: C.ink }}>
                        {v.operator?.name || "—"}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 13, color: C.ink }}>
                        {v.vehicle_type || "—"}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 13, fontFamily: mono, color: C.ink, textAlign: "right" }}>
                        {v.capacity_kg} kg
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 13, color: C.ink }}>
                        {v.depot?.name || "—"}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <StatusBadge status={v.status} />
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
            <Panel title="VEHICLE DETAILS">
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
                      <Truck size={14} /> Vehicle Type
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{selected.vehicle_type || "—"}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                    <div style={{ fontSize: 13, color: C.slate, display: "flex", alignItems: "center", gap: 8 }}>
                      <Truck size={14} /> Capacity
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: mono, color: C.ink }}>{selected.capacity_kg} kg</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                    <div style={{ fontSize: 13, color: C.slate, display: "flex", alignItems: "center", gap: 8 }}>
                      <MapPin size={14} /> Base Depot
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                      {selected.depot?.name || "—"}
                    </div>
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
