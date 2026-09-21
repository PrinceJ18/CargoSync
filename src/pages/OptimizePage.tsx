import { useState } from "react";
import { CheckCircle2, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { Panel } from "../components/shared/Panel";
import { ResultComparison } from "../features/process/ResultComparison";
import type { OptimizationRunResponse } from "../types/api";
const SCENARIO_STATS = {
  DEMO: { orders: 150, vehicles: 15, depots: 3, returns: 23 },
  NETWORK: { orders: 493, vehicles: 53, depots: 20, returns: 109 }
};

const PIPELINE_STAGES = [
  "Orders", "DBSCAN", "Cluster Validation", "Capacity",
  "Road Costs", "Baseline", "OR-Tools", "Return Loads", "Savings", "Persistence"
];
export function OptimizePage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OptimizationRunResponse | null>(null);
  const [scenario, setScenario] = useState("DEMO");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const { api } = await import("../services/apiClient");
      const res = await api.optimization.run({ scenario_id: scenario });
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to run optimization");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Optimize</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>Build a scenario and run the constrained optimization engine.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel title="Scenario Setup">
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Select Dataset:</label>
            <select 
              value={scenario} 
              onChange={(e) => setScenario(e.target.value)}
              disabled={running}
              style={{ width: "100%", padding: "8px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 13 }}
            >
              <option value="DEMO">Regional Network (Standard)</option>
              <option value="NETWORK">Extended Network (High Volume)</option>
            </select>
          </div>
          <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 10 }}>Configures active operators and logistics demand based on scenario context.</div>
          
          <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: C.slate, marginBottom: 16, background: C.cream, padding: "8px 12px", borderRadius: 4 }}>
            <span>Orders: {SCENARIO_STATS[scenario as keyof typeof SCENARIO_STATS]?.orders}</span>
            <span>Vehicles: {SCENARIO_STATS[scenario as keyof typeof SCENARIO_STATS]?.vehicles}</span>
            <span>Depots: {SCENARIO_STATS[scenario as keyof typeof SCENARIO_STATS]?.depots}</span>
            <span>Return Loads: {SCENARIO_STATS[scenario as keyof typeof SCENARIO_STATS]?.returns}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {["Capacity constraints", "Time windows", "Return-load matching"].map((f) => (
              <span key={f} style={{ fontSize: 11.5, fontFamily: mono, border: `1px solid ${C.stone}`, padding: "5px 10px", borderRadius: 999 }}>{f}</span>
            ))}
          </div>
          <button onClick={run} disabled={running} style={{ background: C.coral, color: C.ivory, border: "none", padding: "11px 20px", borderRadius: 4, fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: running ? 0.6 : 1 }}>
            {running ? "Running..." : "Run Optimization"}
          </button>
        </Panel>
        <Panel title="Pipeline Execution">
          {running ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <RefreshCw size={18} color={C.coral} className="spin" />
                <div style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>Optimization engine running...</div>
              </div>
              <div style={{ fontSize: 12, color: C.slate }}>Executing synchronous pipeline. This typically takes 2-5 seconds.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 4px", marginTop: 4 }}>
                {PIPELINE_STAGES.map((stage, i) => (
                  <div key={stage} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, fontFamily: mono, color: C.ink, background: C.cream, border: `1px solid ${C.stone}`, padding: "3px 8px", borderRadius: 4 }}>
                      {stage}
                    </span>
                    {i < PIPELINE_STAGES.length - 1 && <ArrowRight size={10} color={C.slate} />}
                  </div>
                ))}
              </div>
            </div>
          ) : result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.ink, fontWeight: 600 }}>
                {result.status === "COMPLETED" ? <CheckCircle2 size={18} color={C.emerald} /> : <AlertTriangle size={18} color={result.status === "PARTIAL" ? "#B58500" : C.coral} />}
                Optimization {result.status === "COMPLETED" ? "Successful" : result.status === "PARTIAL" ? "Partially Successful" : "Failed"}
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12.5 }}>
                <div><span style={{ color: C.slate }}>Run ID:</span> <span style={{ fontFamily: mono }}>{result.run_id?.slice(0,8)}</span></div>
                <div><span style={{ color: C.slate }}>Scenario:</span> {result.scenario}</div>
                {result.solver_status && <div><span style={{ color: C.slate }}>Solver Status:</span> <span style={{ fontWeight: 600, color: result.solver_status === "OPTIMAL" ? C.emerald : C.coral }}>{result.solver_status}</span></div>}
                {result.routes && <div><span style={{ color: C.slate }}>Routes Generated:</span> {result.routes.length}</div>}
              </div>

              {result.diagnostics && result.diagnostics.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: C.slate }}>Diagnostics Output</div>
                  <div style={{ background: C.cream, padding: 12, borderRadius: 6, fontSize: 11.5, fontFamily: mono, color: C.slate, maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                    {result.diagnostics.map((d, i) => (
                      <div key={i}><span style={{ color: d.level === "ERROR" ? C.coral : d.level === "WARNING" ? "#B58500" : C.slate }}>[{d.level}]</span> {d.message}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : error ? (
             <div style={{ color: C.coral, fontSize: 13 }}>{error}</div>
          ) : (
             <div style={{ fontSize: 13, color: C.slate }}>Ready to run.</div>
          )}
        </Panel>
      </div>
      {result && result.metrics && (
        <div style={{ marginTop: 24 }}>
          <ResultComparison result={result} />
        </div>
      )}
    </div>
  );
}

