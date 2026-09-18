import { useState, useEffect } from "react";
import { CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { PIPELINE } from "../data/prototype/demoData";
import { Panel } from "../components/shared/Panel";
import { ResultComparison } from "../features/process/ResultComparison";

export function OptimizePage() {
  const [running, setRunning] = useState(false);
  const [stageIdx, setStageIdx] = useState(-1);
  const [done, setDone] = useState(false);

  const run = () => {
    setRunning(true); setDone(false); setStageIdx(0);
  };
  
  useEffect(() => {
    if (!running) return;
    if (stageIdx >= PIPELINE.length) { setRunning(false); setDone(true); return; }
    const t = setTimeout(() => setStageIdx((i) => i + 1), 380);
    return () => clearTimeout(t);
  }, [running, stageIdx]);

  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Optimize</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>Build a scenario and run the constrained optimization engine.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel title="Scenario">
          <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 10 }}>4 operators · 119 orders · 16 vehicles selected</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {["Capacity constraints", "Time windows", "Return-load matching"].map((f) => (
              <span key={f} style={{ fontSize: 11.5, fontFamily: mono, border: `1px solid ${C.stone}`, padding: "5px 10px", borderRadius: 999 }}>{f}</span>
            ))}
          </div>
          <button onClick={run} disabled={running} style={{ background: C.coral, color: C.ivory, border: "none", padding: "11px 20px", borderRadius: 4, fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: running ? 0.6 : 1 }}>
            {running ? "Running..." : "Run Optimization"}
          </button>
        </Panel>
        <Panel title="Pipeline">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PIPELINE.map((p, i) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: i <= stageIdx ? C.ink : C.slate, transition: "color 0.3s" }}>
                {i < stageIdx || done ? <CheckCircle2 size={13} color={C.emerald} /> : i === stageIdx ? <RefreshCw size={13} color={C.coral} className="spin" /> : <Circle size={13} color={C.stone} />}
                {p}
              </div>
            ))}
          </div>
        </Panel>
      </div>
      {done && (
        <div style={{ marginTop: 24 }}>
          <ResultComparison />
        </div>
      )}
    </div>
  );
}

