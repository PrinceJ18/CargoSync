import { useNavigate } from "react-router-dom";

import { C, font } from "../data/prototype/designTokens";
import CargoSyncLogo from "../assets/branding/CargoSync_Logo.png";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: C.ivory, fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <img src={CargoSyncLogo} alt="CargoSync" style={{ width: 28, height: 28, objectFit: "contain" }} />
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.01em", color: C.ink, marginBottom: 12 }}>Page not found</h1>
      <p style={{ fontSize: 16, color: C.slate, maxWidth: 400, lineHeight: 1.6, marginBottom: 32 }}>
        The route you are looking for does not exist in the CargoSync network.
      </p>
      <button 
        onClick={() => navigate("/")} 
        style={{
          background: C.ink, color: C.ivory, border: "none", padding: "12px 24px", 
          borderRadius: 6, fontSize: 14.5, fontWeight: 600, cursor: "pointer"
        }}
      >
        Return to Landing
      </button>
    </div>
  );
}
