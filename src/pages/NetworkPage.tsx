import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import { X, MapPin, Package, RefreshCw } from "lucide-react";
import { C } from "../data/prototype/designTokens";
import type { Order, ReturnLoad, Depot } from "../types/api";

export function NetworkPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnLoads, setReturnLoads] = useState<ReturnLoad[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [showDepots, setShowDepots] = useState(true);
  const [showOrders, setShowOrders] = useState(true);
  const [showReturns, setShowReturns] = useState(true);
  const [selected, setSelected] = useState<{ type: "depot" | "order" | "return"; data: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected) {
      if (selected.type === "depot" && !showDepots) setSelected(null);
      if (selected.type === "order" && !showOrders) setSelected(null);
      if (selected.type === "return" && !showReturns) setSelected(null);
    }
  }, [showDepots, showOrders, showReturns]);

  useEffect(() => {
    import("../services/apiClient").then(({ api }) => {
      Promise.all([
        api.orders.list(),
        api.returnLoads.list(),
        api.fleet.listDepots()
      ]).then(([o, r, d]) => {
        setOrders(o);
        setReturnLoads(r);
        setDepots(d);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setError("Failed to load network data. Please ensure the backend is running.");
        setLoading(false);
      });
    });
  }, []);

  // Center on Indore roughly
  const center: [number, number] = [22.7196, 75.8577];

  return (
    <div style={{ padding: 26, display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Network Map</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 18 }}>Geographical distribution of pending orders, depots, and return loads.</div>
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 14, background: C.ivory, padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.stone}` }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            <input type="checkbox" checked={showDepots} onChange={(e) => setShowDepots(e.target.checked)} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.navy }} /> Depots ({depots.length})
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            <input type="checkbox" checked={showOrders} onChange={(e) => setShowOrders(e.target.checked)} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.coral }} /> Orders ({orders.length})
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            <input type="checkbox" checked={showReturns} onChange={(e) => setShowReturns(e.target.checked)} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.emerald }} /> Return Loads ({returnLoads.length})
          </label>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 20, flex: 1, minHeight: 0 }}>
        <div style={{ border: `1px solid ${C.stone}`, borderRadius: 6, overflow: "hidden", background: C.cream, position: "relative", zIndex: 10, height: "100%", minHeight: 500, display: "flex", flexDirection: "column" }}>
        {loading ? (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 14, color: C.slate }}>Loading map data...</div>
        ) : error ? (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 14, color: C.coral }}>{error}</div>
        ) : (
          <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {showDepots && depots.map(d => {
              const isSel = selected?.type === "depot" && selected.data.id === d.id;
              return (
                <CircleMarker key={`d-${d.id}`} center={[d.latitude, d.longitude]} radius={isSel ? 10 : 8} 
                  pathOptions={{ color: isSel ? C.ink : C.navy, fillColor: C.navy, fillOpacity: 0.8, weight: isSel ? 3 : 1 }}
                  eventHandlers={{ click: () => setSelected({ type: "depot", data: d }) }} />
              );
            })}
            {showOrders && orders.map(o => {
              const isSel = selected?.type === "order" && selected.data.id === o.id;
              return (
                <CircleMarker key={`o-${o.id}`} center={[o.destination_latitude, o.destination_longitude]} radius={isSel ? 7 : 5} 
                  pathOptions={{ color: isSel ? C.ink : C.slate, fillColor: C.coral, fillOpacity: 0.8, weight: isSel ? 3 : 1 }}
                  eventHandlers={{ click: () => setSelected({ type: "order", data: o }) }} />
              );
            })}
            {showReturns && returnLoads.map(r => {
              const isSel = selected?.type === "return" && selected.data.id === r.id;
              const plat = r.pickup_latitude ?? (r as any).pickup_location?.[0];
              const plon = r.pickup_longitude ?? (r as any).pickup_location?.[1];
              if (plat === undefined || plon === undefined) return null;
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
                  <div><div style={{ fontSize: 11, color: C.slate }}>Name</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selected.data.name}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>System ID</div><div style={{ fontSize: 13, fontFamily: "monospace" }}>{selected.data.id}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Operator ID</div><div style={{ fontSize: 13, fontFamily: "monospace" }}>{selected.data.operator_id?.slice(0,8) || "Unknown"}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Coordinates</div><div style={{ fontSize: 13 }}>{selected.data.latitude.toFixed(4)}, {selected.data.longitude.toFixed(4)}</div></div>
                </>
              )}
              {selected.type === "order" && (
                <>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Order Ref</div><div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>{selected.data.reference_number || selected.data.id.slice(0,8)}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Status</div><div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{selected.data.status}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Weight</div><div style={{ fontSize: 13 }}>{selected.data.weight_kg} kg</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Operator ID</div><div style={{ fontSize: 13, fontFamily: "monospace" }}>{selected.data.operator_id?.slice(0,8) || "Unknown"}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Destination</div><div style={{ fontSize: 13 }}>{selected.data.destination_latitude.toFixed(4)}, {selected.data.destination_longitude.toFixed(4)}</div></div>
                </>
              )}
              {selected.type === "return" && (
                <>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Return Load Ref</div><div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>{selected.data.reference_number || selected.data.id.slice(0,8)}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Weight</div><div style={{ fontSize: 13 }}>{selected.data.weight_kg} kg</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Operator ID</div><div style={{ fontSize: 13, fontFamily: "monospace" }}>{selected.data.operator_id?.slice(0,8) || "Unknown"}</div></div>
                  <div><div style={{ fontSize: 11, color: C.slate }}>Pickup</div><div style={{ fontSize: 13 }}>{(selected.data.pickup_latitude ?? selected.data.pickup_location?.[0])?.toFixed(4)}, {(selected.data.pickup_longitude ?? selected.data.pickup_location?.[1])?.toFixed(4)}</div></div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

