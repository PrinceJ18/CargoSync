import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { C, mono } from "../../data/prototype/designTokens";

interface FeatureCardProps {
  n: string;
  title: string;
  text: string;
  mini: ReactNode;
  delay?: number;
}

export function FeatureCard({ n, title, text, mini, delay = 0 }: FeatureCardProps) {
  return (
    <Reveal delay={delay}>
      <div 
        className="c-card-hover"
        style={{
        background: C.ivory, border: `1px solid ${C.stone}`, borderRadius: 4, padding: "26px 24px",
        display: "flex", flexDirection: "column", gap: 14, height: "100%",
        cursor: "default"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: mono, fontSize: 12, color: C.slate }}>{n}</span>
          <div className="c-icon">{mini}</div>
        </div>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: C.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>{title}</div>
          <div style={{ fontSize: 13.5, color: "#5B5E68", lineHeight: 1.55 }}>{text}</div>
        </div>
      </div>
    </Reveal>
  );
}

