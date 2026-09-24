import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import { X, MapPin, Package, RefreshCw, Loader2, AlertCircle, Search } from "lucide-react";
import { C } from "../data/prototype/designTokens";
import { useAuth } from "../contexts/AuthContext";
import type { Order, ReturnLoad, Depot } from "../types/api";
import { useMobile } from "../hooks/useMobile";

export function NetworkPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const isMobile = useMobile();

  const [orders, setOrders] = useState<Order[]>([]);
  const [returnLoads, setReturnLoads] = useState<ReturnLoad[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [scenario, setScenario] = useState("DEMO");
  
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalReturnLoads, setTotalReturnLoads] = useState(0);
  const [totalDepots, setTotalDepots] = useState(0);

  const [showDepots, setShowDepots] = useState(true);
  const [showOrders, setShowOrders] = useState(true);
  const [showReturns, setShowReturns] = useState(true);
  const [selected, setSelected] = useState<{ type: "depot" | "order" | "return"; data: any } | null>(null);
  
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [partialErrors, setPartialErrors] = useState<string[]>([]);

  useEffect(() => {
    if (selected) {
      if (selected.type === "depot" && !showDepots) setSelected(null);
      if (selected.type === "order" && !showOrders) setSelected(null);
      if (selected.type === "return" && !showReturns) setSelected(null);
    }
  }, [showDepots, showOrders, showReturns, selected]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const loadData = () => {
    setFetchStatus("loading");
    setError(null);
    setPartialErrors([]);
    import("../services/apiClient").then(({ api }) => {
      Promise.allSettled([
        api.orders.list({ page_size: 100, scenario }), // Load a larger slice for the map view
        api.returnLoads.list({ page_size: 100, scenario }),
        api.fleet.listDepots({ page_size: 100, scenario })
      ]).then(([oRes, rRes, dRes]) => {
        let hasError = false;
        const errs: string[] = [];

        if (oRes.status === "fulfilled") {
          setOrders(oRes.value.items);
          setTotalOrders(oRes.value.total);
        } else {
          hasError = true;
          errs.push("Orders");
          console.error("Orders failed:", oRes.reason);
        }

        if (rRes.status === "fulfilled") {
          setReturnLoads(rRes.value.items);
          setTotalReturnLoads(rRes.value.total);
        } else {
          hasError = true;
          errs.push("Return Loads");
          console.error("Return Loads failed:", rRes.reason);
        }

        if (dRes.status === "fulfilled") {
          setDepots(dRes.value.items);
          setTotalDepots(dRes.value.total);
        } else {
          hasError = true;
          errs.push("Depots");
          console.error("Depots failed:", dRes.reason);
        }

        if (hasError) {
          if (oRes.status === "rejected" && rRes.status === "rejected" && dRes.status === "rejected") {
            setError("Failed to load map data. Please check your connection.");
            setFetchStatus("error");
          } else {
            setPartialErrors(errs);
            setFetchStatus("success");
          }
        } else {
          setFetchStatus("success");
        }
      }).catch(err => {
        console.error(err);
        setError("An unexpected error occurred while loading map data.");
        setFetchStatus("error");
      });
    });
  };

  useEffect(() => {
    loadData();
  }, [scenario]);

  // Center on Indore roughly
  const center: [number, number] = [22.7196, 75.8577];

  const [searchTerm, setSearchTerm] = useState("");

  // ─── Business Layout Branch ───
  if (!isAdmin) {
    const availableReturns = returnLoads.filter(r => r.status === "PENDING" || (r.status || "AVAILABLE") === "AVAILABLE").length;
    const matchedReturns = returnLoads.filter(r => r.status === "MATCHED").length;
    
    const filteredReturns = returnLoads.filter(r => {
      if (!searchTerm) return true;
      const ref = r.reference_number || r.id;
      return ref.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const isSel = (r: ReturnLoad) => selected?.type === "return" && selected.data.id === r.id;

    return (
      <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", width: "100%", height: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
        
        {/* HEADER */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: 8 }}>Return Loads</div>
            <div style={{ fontSize: 14.5, color: C.slate, maxWidth: 650, lineHeight: 1.5 }}>
              Use available capacity on return journeys by matching compatible loads after delivery.
            </div>
          </div>
          <div style={{ width: isMobile ? "100%" : 240 }}>
            <select 
              aria-label="Select Scenario"
              value={scenario} 
              onChange={(e) => setScenario(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 13, background: C.ivory, cursor: "pointer" }}
            >
              <option value="DEMO">Regional Network (Standard)</option>
              <option value="NETWORK">Extended Network (High Volume)</option>
            </select>
          </div>
        </div>

        {partialErrors.length > 0 && (
          <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 16px", borderRadius: 6, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexShrink: 0 }}>
            <AlertCircle size={16} />
            Some data sources failed to load: {partialErrors.join(", ")}. Showing available data.
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24, flexShrink: 0 }}>
           <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
              <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8 }}>Total Return Loads</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", color: C.ink }}>{totalReturnLoads}</div>
           </div>
           <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
              <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8 }}>Available Opportunities</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", color: C.ink }}>{availableReturns}</div>
           </div>
           <div className="c-card" style={{ background: C.ivory, padding: 20, borderRadius: 8, border: `1px solid ${C.stone}` }}>
              <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8 }}>Matched Loads</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", color: C.emerald }}>{matchedReturns}</div>
           </div>
        </div>

        {/* WORKSPACE GRID */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 24, flex: 1, minHeight: 0 }}>
           
           {/* LIST PANEL */}
           <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.cream, borderRadius: 8, border: `1px solid ${C.stone}`, overflow: "hidden" }}>
              <div style={{ padding: 16, borderBottom: `1px solid ${C.stone}`, background: C.ivory, display: "flex", alignItems: "center", gap: 12 }}>
                 <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                    <Search size={14} color={C.slate} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                    <input 
                      type="text" 
                      placeholder="Search return loads..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 13 }}
                    />
                 </div>
              </div>
              
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {fetchStatus === "loading" && returnLoads.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: C.slate }}>
                    <Loader2 size={18} className="spin" />
                  </div>
                ) : filteredReturns.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, color: C.slate }}>
                    <RefreshCw size={24} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>No return loads found</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search criteria.</div>
                  </div>
                ) : (
                  filteredReturns.map(r => {
                    const sel = isSel(r);
                    const status = r.status === "PENDING" ? "AVAILABLE" : (r.status || "AVAILABLE");
                    const isMatched = status === "MATCHED";
                    return (
                      <div 
                        key={r.id}
                        role="button"
                        tabIndex={0}
                        aria-selected={sel}
                        onClick={() => setSelected({ type: "return", data: r })}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelected({ type: "return", data: r }) }}
                        className={!sel ? "c-card-hover" : ""}
                        style={{
                          padding: 16, border: `1.5px solid ${sel ? C.coral : C.stone}`,
                          borderRadius: 8, background: sel ? C.ivory : C.cream,
                          cursor: "pointer", transition: "all 0.2s",
                          boxShadow: sel ? "0 4px 12px rgba(232,84,46,0.08)" : "none",
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: C.ink }}>{r.reference_number || r.id.slice(0, 8)}</div>
                            <div style={{ 
                              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                              background: isMatched ? "rgba(23,124,107,0.1)" : "rgba(27,35,51,0.05)",
                              color: isMatched ? C.emerald : C.slate
                            }}>
                              {status}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: C.slate }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Package size={12} /> {r.weight_kg} kg</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {(r.pickup_latitude ?? r.pickup_location?.[0])?.toFixed(4)}, {(r.pickup_longitude ?? r.pickup_location?.[1])?.toFixed(4)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
           </div>

           {/* DETAILS PANEL */}
           <div style={{ width: isMobile ? "100%" : 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
             {selected && selected.type === "return" ? (
               <div style={{ background: C.navy, borderRadius: 8, padding: 24, color: C.ivory, border: `1px solid ${C.charcoal}`, position: "relative" }}>
                 <button aria-label="Close details" onClick={() => setSelected(null)} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                   <X size={18} color={C.slate} />
                 </button>
                 
                 <div style={{ fontSize: 11, fontFamily: "monospace", color: C.peach, letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>RETURN LOAD</div>
                 <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                   <RefreshCw size={20} color={C.ivory} />
                   <span style={{ fontSize: 18, fontWeight: 700, color: C.ivory, fontFamily: "monospace" }}>{selected.data.reference_number || selected.data.id.slice(0,12)}</span>
                 </div>
                 
                 <div style={{ display: "flex", flexDirection: "column", gap: 16, background: "rgba(0,0,0,0.15)", padding: 16, borderRadius: 6 }}>
                   <div>
                     <div style={{ fontSize: 11, color: "rgba(250,246,239,0.7)", marginBottom: 4 }}>Status</div>
                     <div style={{ fontSize: 13, fontWeight: 600, color: (selected.data.status || "AVAILABLE") === "MATCHED" ? C.emerald : C.ivory }}>{selected.data.status === "PENDING" ? "AVAILABLE" : (selected.data.status || "AVAILABLE")}</div>
                   </div>
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                     <div>
                       <div style={{ fontSize: 11, color: "rgba(250,246,239,0.7)", marginBottom: 4 }}>Weight</div>
                       <div style={{ fontSize: 13, fontWeight: 600 }}>{selected.data.weight_kg} kg</div>
                     </div>
                     <div>
                       <div style={{ fontSize: 11, color: "rgba(250,246,239,0.7)", marginBottom: 4 }}>Operator</div>
                       <div style={{ fontSize: 13, fontWeight: 600 }}>{selected.data.operator?.name || "—"}</div>
                     </div>
                   </div>
                   <div>
                     <div style={{ fontSize: 11, color: "rgba(250,246,239,0.7)", marginBottom: 4 }}>Pickup Coordinates</div>
                     <div style={{ fontSize: 13, fontFamily: "monospace" }}>{(selected.data.pickup_latitude ?? selected.data.pickup_location?.[0])?.toFixed(4)}, {(selected.data.pickup_longitude ?? selected.data.pickup_location?.[1])?.toFixed(4)}</div>
                   </div>
                   <div>
                     <div style={{ fontSize: 11, color: "rgba(250,246,239,0.7)", marginBottom: 4 }}>Destination Coordinates</div>
                     <div style={{ fontSize: 13, fontFamily: "monospace" }}>{(selected.data.delivery_latitude ?? selected.data.delivery_location?.[0])?.toFixed(4)}, {(selected.data.delivery_longitude ?? selected.data.delivery_location?.[1])?.toFixed(4)}</div>
                   </div>
                 </div>
               </div>
             ) : (
               <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 8, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.slate, height: 300 }}>
                 <RefreshCw size={24} style={{ marginBottom: 16, opacity: 0.5 }} />
                 <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Select a Return Load</div>
                 <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 220 }}>Click any load in the list to view pickup details and operational status.</div>
               </div>
             )}
           </div>

        </div>
      </div>
    );
  }

  // ─── Admin Layout Branch ───
  return (
    <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", width: "100%", height: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: 8 }}>Indore Logistics Network</div>
          <div style={{ fontSize: 14.5, color: C.slate, maxWidth: 650, lineHeight: 1.5 }}>
            Geographical distribution of active orders, depots, and available return-load opportunities.
          </div>
        </div>
        <div style={{ width: isMobile ? "100%" : 240 }}>
          <select 
            aria-label="Select Scenario"
            value={scenario} 
            onChange={(e) => setScenario(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.stone}`, fontSize: 13, background: C.ivory, cursor: "pointer" }}
          >
            <option value="DEMO">Indore Regional Network</option>
            <option value="NETWORK">Extended Network</option>
          </select>
        </div>
      </div>
      
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <fieldset style={{ display: "flex", flexWrap: "wrap", gap: 16, background: C.ivory, padding: "12px 20px", borderRadius: 8, border: `1px solid ${C.stone}`, margin: 0 }}>
          <legend className="sr-only" style={{ display: "none" }}>Map Filters</legend>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer", fontWeight: 600, color: showDepots ? C.ink : C.slate, transition: "color 0.2s" }}>
            <input type="checkbox" checked={showDepots} onChange={(e) => setShowDepots(e.target.checked)} style={{ accentColor: C.navy }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.navy, opacity: showDepots ? 1 : 0.5 }} aria-hidden="true" /> 
            Depots <span style={{ color: C.slate, fontWeight: 400 }}>({fetchStatus === "loading" && depots.length === 0 ? "..." : totalDepots})</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer", fontWeight: 600, color: showOrders ? C.ink : C.slate, transition: "color 0.2s" }}>
            <input type="checkbox" checked={showOrders} onChange={(e) => setShowOrders(e.target.checked)} style={{ accentColor: C.coral }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.coral, opacity: showOrders ? 1 : 0.5 }} aria-hidden="true" /> 
            Orders <span style={{ color: C.slate, fontWeight: 400 }}>({fetchStatus === "loading" && orders.length === 0 ? "..." : totalOrders})</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer", fontWeight: 600, color: showReturns ? C.ink : C.slate, transition: "color 0.2s" }}>
            <input type="checkbox" checked={showReturns} onChange={(e) => setShowReturns(e.target.checked)} style={{ accentColor: C.emerald }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.emerald, opacity: showReturns ? 1 : 0.5 }} aria-hidden="true" /> 
            Return Loads <span style={{ color: C.slate, fontWeight: 400 }}>({fetchStatus === "loading" && returnLoads.length === 0 ? "..." : totalReturnLoads})</span>
          </label>
        </fieldset>
      </div>

      {partialErrors.length > 0 && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 16px", borderRadius: 6, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <AlertCircle size={16} />
          Some data sources failed to load: {partialErrors.join(", ")}. Showing available data.
        </div>
      )}
      
      <div style={{ display: isMobile ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: selected && !isMobile ? "1fr 340px" : "1fr", gap: 20, flex: 1, minHeight: 0 }}>
        <div style={{ border: `1px solid ${C.stone}`, borderRadius: 6, overflow: "hidden", background: C.cream, position: "relative", zIndex: 1, height: "100%", minHeight: 500, display: "flex", flexDirection: "column" }}>
        
        {fetchStatus === "loading" && (!orders.length && !returnLoads.length && !depots.length) && (
          <div role="status" aria-label="Loading map data" style={{ position: "absolute", zIndex: 1000, top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.slate, background: "rgba(255,255,255,0.9)", padding: "12px 24px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <Loader2 size={18} className="spin" aria-hidden="true" /> Loading map data...
          </div>
        )}

        {fetchStatus === "success" && (!orders.length && !returnLoads.length && !depots.length) && (
          <div style={{ position: "absolute", zIndex: 1000, top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 14, color: C.slate, background: "rgba(255,255,255,0.9)", padding: "20px 24px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <div style={{ fontWeight: 600, color: C.ink }}>No network data available</div>
            <div style={{ fontSize: 13 }}>There are no orders, return loads, or depots.</div>
          </div>
        )}
        
        {error && (!orders.length && !returnLoads.length && !depots.length) ? (
          <div style={{ position: "absolute", zIndex: 1000, top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, fontSize: 14, color: C.ink, background: "rgba(255,255,255,0.9)", padding: "20px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <AlertCircle size={24} color={C.coral} />
            <div style={{ textAlign: "center", maxWidth: 250 }}>{error}</div>
            <button onClick={loadData} style={{ background: C.ink, color: C.ivory, border: "none", padding: "6px 14px", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : (
          <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {showDepots && depots.map(d => {
              const isSel = selected?.type === "depot" && selected.data.id === d.id;
              // Validate coordinates
              if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number') return null;
              return (
                <CircleMarker key={`d-${d.id}`} center={[d.latitude, d.longitude]} radius={isSel ? 10 : 8} 
                  pathOptions={{ color: isSel ? C.ink : C.navy, fillColor: C.navy, fillOpacity: 0.8, weight: isSel ? 3 : 1 }}
                  eventHandlers={{ click: () => setSelected({ type: "depot", data: d }) }} />
              );
            })}
            {showOrders && orders.map(o => {
              const isSel = selected?.type === "order" && selected.data.id === o.id;
              // Validate coordinates
              if (typeof o.destination_latitude !== 'number' || typeof o.destination_longitude !== 'number') return null;
              return (
                <CircleMarker key={`o-${o.id}`} center={[o.destination_latitude, o.destination_longitude]} radius={isSel ? 7 : 5} 
                  pathOptions={{ color: isSel ? C.ink : C.slate, fillColor: C.coral, fillOpacity: 0.8, weight: isSel ? 3 : 1 }}
                  eventHandlers={{ click: () => setSelected({ type: "order", data: o }) }} />
              );
            })}
            {showReturns && returnLoads.map(r => {
              const isSel = selected?.type === "return" && selected.data.id === r.id;
              // Handle coordinate variations safely
              const plat = r.pickup_latitude ?? r.pickup_location?.[0];
              const plon = r.pickup_longitude ?? r.pickup_location?.[1];
              if (typeof plat !== 'number' || typeof plon !== 'number') return null;
              
              return (
                <CircleMarker key={`r-${r.id}`} center={[plat, plon]} radius={isSel ? 8 : 6} 
                  pathOptions={{ color: isSel ? C.ink : C.emerald, fillColor: C.emerald, fillOpacity: 0.6, weight: isSel ? 3 : 1 }}
                  eventHandlers={{ click: () => setSelected({ type: "return", data: r }) }} />
              );
            })}
          </MapContainer>
        )}
        </div>
        
        {selected && (
          <div style={isMobile 
            ? { position: "fixed", inset: 0, zIndex: 1000, background: C.ivory, padding: 26, overflowY: "auto" }
            : { background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 22, overflowY: "auto" }
          }>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {selected.type === "depot" && <MapPin size={18} color={C.navy} aria-hidden="true" />}
                {selected.type === "order" && <Package size={18} color={C.coral} aria-hidden="true" />}
                {selected.type === "return" && <RefreshCw size={18} color={C.emerald} aria-hidden="true" />}
                <div style={{ fontSize: 16, fontWeight: 700, textTransform: "capitalize" }}>{selected.type} Details</div>
              </div>
              <button aria-label="Close details" onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <X size={18} color={C.slate} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {selected.type === "depot" && (
                <>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Depot Name</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selected.data.name}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Operator</div><div style={{ fontSize: 13, fontWeight: 500 }}>{selected.data.operator?.name || "—"}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Coordinates</div><div style={{ fontSize: 13, fontFamily: "monospace" }}>{selected.data.latitude.toFixed(4)}, {selected.data.longitude.toFixed(4)}</div></div>
                </>
              )}
              {selected.type === "order" && (
                <>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Order Reference</div><div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>{selected.data.reference_number || selected.data.id.slice(0,12)}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Status</div><div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{selected.data.status}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Weight</div><div style={{ fontSize: 13 }}>{selected.data.weight_kg} kg</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Origin Depot</div><div style={{ fontSize: 13 }}>{selected.data.origin_depot?.name || "—"}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Destination Coordinates</div><div style={{ fontSize: 13, fontFamily: "monospace" }}>{selected.data.destination_latitude.toFixed(4)}, {selected.data.destination_longitude.toFixed(4)}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Operator</div><div style={{ fontSize: 13, fontWeight: 500 }}>{selected.data.operator?.name || "—"}</div></div>
                </>
              )}
              {selected.type === "return" && (
                <>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Return Load Reference</div><div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>{selected.data.reference_number || selected.data.id.slice(0,12)}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Status</div><div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{selected.data.status || "AVAILABLE"}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Weight</div><div style={{ fontSize: 13 }}>{selected.data.weight_kg} kg</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Pickup Coordinates</div><div style={{ fontSize: 13, fontFamily: "monospace" }}>{(selected.data.pickup_latitude ?? selected.data.pickup_location?.[0])?.toFixed(4)}, {(selected.data.pickup_longitude ?? selected.data.pickup_location?.[1])?.toFixed(4)}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Destination Coordinates</div><div style={{ fontSize: 13, fontFamily: "monospace" }}>{(selected.data.delivery_latitude ?? selected.data.delivery_location?.[0])?.toFixed(4)}, {(selected.data.delivery_longitude ?? selected.data.delivery_location?.[1])?.toFixed(4)}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Operator</div><div style={{ fontSize: 13, fontWeight: 500 }}>{selected.data.operator?.name || "—"}</div></div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
