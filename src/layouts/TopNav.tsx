import { useState } from "react";
import { Search, Bell, Navigation, ChevronDown } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";

interface TopNavProps {
  page: string;
  setPage: (p: string) => void;
  role: string;
  onLogout: () => void;
}

export function TopNav({ page, setPage, role, onLogout }: TopNavProps) {
  const [menu, setMenu] = useState(false);
  const items = ["Overview", "Orders", "Fleet", "Network", "Optimize", "Routes", "Impact"];
  
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 26px", borderBottom: `1px solid ${C.stone}`, background: C.ivory, position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Navigation size={11} color={C.ivory} strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>CargoSync</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {items.map((it) => (
            <button key={it} onClick={() => setPage(it.toLowerCase())} style={{
              background: page === it.toLowerCase() ? C.stone : "transparent", border: "none",
              padding: "7px 13px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer",
              color: page === it.toLowerCase() ? C.ink : "#5B5E68",
            }}>{it}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Search size={16} color={C.slate} style={{ cursor: "pointer" }} />
        <Bell size={16} color={C.slate} style={{ cursor: "pointer" }} />
        <div style={{ fontSize: 11, fontFamily: mono, color: C.emerald, display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald }} /> LIVE
        </div>
        <div style={{ position: "relative" }}>
          <div onClick={() => setMenu(!menu)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.stone}` }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.navy, color: C.ivory, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>PR</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1 }}>Prince</div>
              <div style={{ fontSize: 10, color: C.slate, lineHeight: 1.1 }}>{role === "admin" ? "Admin" : "Operator"}</div>
            </div>
            <ChevronDown size={13} color={C.slate} />
          </div>
          {menu && (
            <div style={{ position: "absolute", right: 0, top: 42, background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 6, width: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              {["Profile", "Settings", "Workspace"].map((m) => (
                <div key={m} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>{m}</div>
              ))}
              <div onClick={onLogout} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", color: C.red, borderTop: `1px solid ${C.stone}` }}>Sign out</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


