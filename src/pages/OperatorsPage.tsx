import { useState, useEffect } from "react";
import { C, mono } from "../data/prototype/designTokens";
import { Users, Loader2, Package, Truck, Search, ShieldAlert, ArrowRight, LayoutDashboard, MapPin, CheckCircle2 } from "lucide-react";
import { Panel } from "../components/shared/Panel";
import { StatusBadge } from "../components/shared/StatusBadge";
import { useMobile } from "../hooks/useMobile";
import { MetricCard } from "../components/shared/MetricCard";
import type { Order, Vehicle, Depot } from "../types/api";

interface OperatorData {
  id: string;
  name: string;
  orders: number;
  vehicles: number;
  status: "ACTIVE";
}

export function OperatorsPage() {
  const isMobile = useMobile();
  
  const [operators, setOperators] = useState<OperatorData[]>([]);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [selectedOp, setSelectedOp] = useState<OperatorData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setFetchStatus("loading");
    import("../services/apiClient").then(({ api }) => {
      Promise.all([
        api.orders.list({ page_size: 1000 }),
        api.fleet.listVehicles({ page_size: 1000 }),
        api.fleet.listDepots({ page_size: 1000 })
      ])
        .then(([oRes, vRes, dRes]) => {
          const orders = oRes.items || [];
          const vehicles = vRes.items || [];
          const depots = dRes.items || [];

          const opsMap = new Map<string, OperatorData>();
          
          depots.forEach((d: Depot) => {
            if (d.operator) {
              if (!opsMap.has(d.operator.id)) opsMap.set(d.operator.id, { id: d.operator.id, name: d.operator.name, orders: 0, vehicles: 0, status: "ACTIVE" });
            }
          });
          
          orders.forEach((o: Order) => {
            if (o.operator) {
              if (!opsMap.has(o.operator.id)) opsMap.set(o.operator.id, { id: o.operator.id, name: o.operator.name, orders: 0, vehicles: 0, status: "ACTIVE" });
              opsMap.get(o.operator.id)!.orders++;
            }
          });

          vehicles.forEach((v: Vehicle) => {
            if (v.operator) {
              if (!opsMap.has(v.operator.id)) opsMap.set(v.operator.id, { id: v.operator.id, name: v.operator.name, orders: 0, vehicles: 0, status: "ACTIVE" });
              opsMap.get(v.operator.id)!.vehicles++;
            }
          });

          setOperators(Array.from(opsMap.values()));
          setFetchStatus("success");
        })
        .catch(err => {
          console.error(err);
          setFetchStatus("error");
        });
    });
  }, []);

  const totalOrders = operators.reduce((acc, curr) => acc + curr.orders, 0);
  const totalVehicles = operators.reduce((acc, curr) => acc + curr.vehicles, 0);

  const filteredOperators = operators.filter(op => 
    op.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    op.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", animation: "fade-in 0.4s ease-out" }}>
      
      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 10 }}>
            OPERATORS
          </div>
          <div style={{ fontSize: 14, color: C.slate, marginTop: 4 }}>
            Manage and monitor the logistics companies participating in the CargoSync network.
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 32, opacity: fetchStatus === "loading" ? 0.6 : 1 }}>
        <MetricCard icon={<Users size={16} color={C.navy} />} label="Active Operators" value={fetchStatus === "success" ? operators.length.toString() : "\u2014"} sub="Participating entities" />
        <MetricCard icon={<Package size={16} color={C.navy} />} label="Network Orders" value={fetchStatus === "success" ? totalOrders.toString() : "\u2014"} sub="Total across operators" />
        <MetricCard icon={<Truck size={16} color={C.navy} />} label="Network Vehicles" value={fetchStatus === "success" ? totalVehicles.toString() : "\u2014"} sub="Combined network capacity" />
      </div>

      {/* Main Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: (selectedOp && !isMobile) ? "1fr 340px" : "1fr", gap: 24, alignItems: "start" }}>
        
        {/* Table Column */}
        <Panel title={`PARTICIPATING OPERATORS (${filteredOperators.length})`}>
          
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.stone}`, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, padding: "8px 12px", borderRadius: 6, width: isMobile ? "100%" : 300, border: `1px solid ${C.stone}` }}>
              <Search size={16} color={C.slate} />
              <input 
                type="text" 
                placeholder="Search operator name or ID..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: C.ink, width: "100%" }}
              />
            </div>
            <div style={{ fontSize: 12, color: C.slate, display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldAlert size={14} />
              Management endpoints currently unavailable. Read-only view.
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            {fetchStatus === "loading" ? (
              <div style={{ padding: 40, textAlign: "center", color: C.slate, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Loader2 size={16} className="spin" /> Loading operators...
              </div>
            ) : fetchStatus === "error" ? (
              <div style={{ padding: 40, textAlign: "center", color: C.coral, fontSize: 14 }}>
                Failed to load operator data.
              </div>
            ) : filteredOperators.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.slate, fontSize: 14 }}>
                No operators found.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.stone}`, fontSize: 11, color: C.slate, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Operator</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>ID</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600, textAlign: "right" }}>Orders</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600, textAlign: "right" }}>Vehicles</th>
                    <th style={{ padding: "16px 20px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperators.map(op => (
                    <tr 
                      key={op.id} 
                      onClick={() => setSelectedOp(op)}
                      className="c-card-hover"
                      style={{ 
                        borderBottom: `1px solid ${C.stone}`, 
                        cursor: "pointer",
                        background: selectedOp?.id === op.id ? C.ivory : "transparent"
                      }}
                    >
                      <td style={{ padding: "16px 20px", fontSize: 14, fontWeight: 600, color: C.ink }}>
                        {op.name}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 12, fontFamily: mono, color: C.slate }}>
                        {op.id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <StatusBadge status={op.status} />
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 14, fontFamily: mono, color: C.ink, textAlign: "right" }}>
                        {op.orders}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 14, fontFamily: mono, color: C.ink, textAlign: "right" }}>
                        {op.vehicles}
                      </td>
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <ArrowRight size={16} color={selectedOp?.id === op.id ? C.coral : C.slate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>

        {/* Detail Panel */}
        {selectedOp && (
          <div className="fade-in" style={{ position: "sticky", top: 24 }}>
            <Panel title="OPERATOR PROFILE">
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{selectedOp.name}</div>
                    <div style={{ fontSize: 12, fontFamily: mono, color: C.slate }}>{selectedOp.id}</div>
                  </div>
                  <StatusBadge status="ACTIVE" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                    <div style={{ fontSize: 13, color: C.slate, display: "flex", alignItems: "center", gap: 8 }}>
                      <Package size={14} /> Total Orders
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: mono, color: C.ink }}>{selectedOp.orders}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.stone}` }}>
                    <div style={{ fontSize: 13, color: C.slate, display: "flex", alignItems: "center", gap: 8 }}>
                      <Truck size={14} /> Total Vehicles
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: mono, color: C.ink }}>{selectedOp.vehicles}</div>
                  </div>
                </div>

                <div style={{ background: C.cream, borderRadius: 8, padding: 16, border: `1px solid ${C.stone}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>Operational Pipeline</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.navy, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LayoutDashboard size={12} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Demand Intake</div>
                        <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>Orders routed to network</div>
                      </div>
                    </div>
                    
                    <div style={{ width: 2, height: 16, background: C.stone, marginLeft: 11 }}></div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.navy, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <MapPin size={12} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Fleet Registration</div>
                        <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>Vehicles active in depots</div>
                      </div>
                    </div>

                    <div style={{ width: 2, height: 16, background: C.stone, marginLeft: 11 }}></div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.emerald, color: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(30,143,107,0.2)", backgroundClip: "padding-box" }}>
                        <CheckCircle2 size={12} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Network Ready</div>
                        <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>Included in next optimization</div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </Panel>
          </div>
        )}

      </div>
    </div>
  );
}
