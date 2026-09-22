import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import { X, MapPin, Package, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { C } from "../data/prototype/designTokens";
import { useAuth } from "../contexts/AuthContext";
import type { Order, ReturnLoad, Depot } from "../types/api";

export function NetworkPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  const [orders, setOrders] = useState<Order[]>([]);
  const [returnLoads, setReturnLoads] = useState<ReturnLoad[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  
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

  const loadData = () => {
    setFetchStatus("loading");
    setError(null);
    setPartialErrors([]);
    import("../services/apiClient").then(({ api }) => {
      Promise.allSettled([
        api.orders.list({ page_size: 100 }), // Load a larger slice for the map view
        api.returnLoads.list({ page_size: 100 }),
        api.fleet.listDepots({ page_size: 100 })
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
  }, []);

  // Center on Indore roughly
  const center: [number, number] = [22.7196, 75.8577];

  return (
    <div style={{ padding: 26, display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Network Map</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 18 }}>
        {isAdmin ? "Geographical distribution of network orders, depots, and return loads." : "Geographical distribution for your operations."}
      </div>
      
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 14, background: C.ivory, padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.stone}` }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            <input type="checkbox" checked={showDepots} onChange={(e) => setShowDepots(e.target.checked)} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.navy }} /> 
            Depots ({fetchStatus === "loading" && depots.length === 0 ? "..." : `${depots.length}${totalDepots > depots.length ? ` of ${totalDepots}` : ""}`})
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            <input type="checkbox" checked={showOrders} onChange={(e) => setShowOrders(e.target.checked)} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.coral }} /> 
            Orders ({fetchStatus === "loading" && orders.length === 0 ? "..." : `${orders.length}${totalOrders > orders.length ? ` of ${totalOrders}` : ""}`})
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            <input type="checkbox" checked={showReturns} onChange={(e) => setShowReturns(e.target.checked)} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.emerald }} /> 
            Return Loads ({fetchStatus === "loading" && returnLoads.length === 0 ? "..." : `${returnLoads.length}${totalReturnLoads > returnLoads.length ? ` of ${totalReturnLoads}` : ""}`})
          </label>
        </div>
      </div>

      {partialErrors.length > 0 && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 16px", borderRadius: 6, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <AlertCircle size={16} />
          Some data sources failed to load: {partialErrors.join(", ")}. Showing available data.
        </div>
      )}
      
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 20, flex: 1, minHeight: 0 }}>
        <div style={{ border: `1px solid ${C.stone}`, borderRadius: 6, overflow: "hidden", background: C.cream, position: "relative", zIndex: 1, height: "100%", minHeight: 500, display: "flex", flexDirection: "column" }}>
        
        {fetchStatus === "loading" && (!orders.length && !returnLoads.length && !depots.length) && (
          <div style={{ position: "absolute", zIndex: 1000, top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.slate, background: "rgba(255,255,255,0.9)", padding: "12px 24px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <Loader2 size={18} className="spin" /> Loading map data...
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
            <AlertCircle size={24} color={C.red} />
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
          <div style={{ background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, padding: 22, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {selected.type === "depot" && <MapPin size={18} color={C.navy} />}
                {selected.type === "order" && <Package size={18} color={C.coral} />}
                {selected.type === "return" && <RefreshCw size={18} color={C.emerald} />}
                <div style={{ fontSize: 16, fontWeight: 700, textTransform: "capitalize" }}>{selected.type} Details</div>
              </div>
              <X size={18} color={C.slate} style={{ cursor: "pointer" }} onClick={() => setSelected(null)} />
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
