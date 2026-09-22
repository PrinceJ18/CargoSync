import { useState, useEffect } from "react";
import { CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Route as RouteIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { C, mono } from "../data/prototype/designTokens";
import { Panel } from "../components/shared/Panel";
import { ResultComparison } from "../features/process/ResultComparison";
import type { OptimizationRunResponse } from "../types/api";

const PIPELINE_STAGES = [
  "Orders", "DBSCAN", "Cluster Validation", "Capacity",
  "Road Costs", "Baseline", "OR-Tools", "Return Loads", "Savings", "Persistence"
];

export function OptimizePage() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OptimizationRunResponse | null>(null);
  const [scenario, setScenario] = useState("DEMO");
  const [error, setError] = useState<string | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

    useEffect(() => {
    let active = true;
    const fetchLatest = async () => {
      setLoadingLatest(true);
      setError(null);
      setResult(null);
      try {
        const { api } = await import("../services/apiClient");
        const res = await api.optimization.getLatest(scenario);
        if (active) setResult(res);
      } catch (err: any) {
        if (active) {
          const apiErr = err as import("../types/api").ApiError;
          if (apiErr.status === 404 || apiErr.code === "NOT_FOUND") {
            // No run exists yet for this scenario, perfectly fine.
            setResult(null);
          } else {
            console.error(apiErr);
            setError(apiErr.message || "Failed to fetch previous optimization run.");
          }
        }
      } finally {
        if (active) setLoadingLatest(false);
      }
    };
    fetchLatest();
    return () => { active = false; };
  }, [scenario]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const { api } = await import("../services/apiClient");
      const res = await api.optimization.run({ scenario: scenario });
      setResult(res);
    } catch (err: any) {
      console.error(err);
      const apiErr = err as import("../types/api").ApiError;
      setError(apiErr.message || "Failed to run optimization.");
    } finally {
      setRunning(false);
    }
  };

  const handleViewRoutes = () => {
    navigate("/app/routes");
  };

  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Optimize</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>Build a scenario and run the constrained optimization engine.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel title="Scenario Setup">
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="scenario-select" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Select Dataset:</label>
            <select 
              id="scenario-select"
              value={scenario} 
              onChange={(e) => {
                if (!running) setScenario(e.target.value);
              }}
              disabled={running}
              style={{ width: "100%", padding: "8px", borderRadius: 4, border: `1px solid ${C.stone}`, fontSize: 13 }}
            >
              <option value="DEMO">Regional Network (Standard)</option>
              <option value="NETWORK">Extended Network (High Volume)</option>
            </select>
          </div>
          <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 16 }}>Configures active operators and logistics demand based on scenario context.</div>
          
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {["Capacity constraints", "Time windows", "Return-load matching"].map((f) => (
              <span key={f} style={{ fontSize: 11.5, fontFamily: mono, border: `1px solid ${C.stone}`, padding: "5px 10px", borderRadius: 999 }}>{f}</span>
            ))}
          </div>
          
          <button 
            onClick={run} 
            disabled={running} 
            style={{ 
              background: C.coral, 
              color: C.ivory, 
              border: "none", 
              padding: "11px 20px", 
              borderRadius: 4, 
              fontWeight: 600, 
              fontSize: 13.5, 
              cursor: running ? "default" : "pointer", 
              opacity: running ? 0.6 : 1,
              width: "100%"
            }}
          >
            {running ? "Optimization in Progress..." : "Run Optimization"}
          </button>
        </Panel>
        <Panel title="Pipeline Execution">
          {running ? (
            <div role="status" aria-label="Optimization Running" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <RefreshCw size={18} color={C.coral} className="spin" aria-hidden="true" />
                <div style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>Optimization engine running...</div>
              </div>
              <div style={{ fontSize: 12, color: C.slate }}>Executing synchronous pipeline. This typically takes a few seconds.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 4px", marginTop: 4 }}>
                {PIPELINE_STAGES.map((stage, i) => (
                  <div key={stage} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, fontFamily: mono, color: C.ink, background: C.cream, border: `1px solid ${C.stone}`, padding: "3px 8px", borderRadius: 4 }}>
                      {stage}
                    </span>
                    {i < PIPELINE_STAGES.length - 1 && <ArrowRight size={10} color={C.slate} aria-hidden="true" />}
                  </div>
                ))}
              </div>
            </div>
          ) : loadingLatest ? (
            <div role="status" aria-label="Loading latest run" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", color: C.slate, fontSize: 13 }}>
              <RefreshCw size={14} className="spin" aria-hidden="true" /> Loading latest run data...
            </div>
          ) : result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.ink, fontWeight: 600 }}>
                {result.status === "COMPLETED" ? <CheckCircle2 size={18} color={C.emerald} /> : <AlertTriangle size={18} color={result.status === "PARTIAL" ? "#B58500" : C.coral} />}
                Optimization {result.status === "COMPLETED" ? "Successful" : result.status === "PARTIAL" ? "Partially Successful" : "Failed"}
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12.5 }}>
                <div><span style={{ color: C.slate }}>Run ID:</span> <span style={{ fontFamily: mono }}>{result.run_id?.slice(0,8) || "—"}</span></div>
                <div><span style={{ color: C.slate }}>Scenario:</span> {result.scenario || "—"}</div>
                <div><span style={{ color: C.slate }}>Solver Status:</span> <span style={{ fontWeight: 600, color: result.solver_status === "OPTIMAL" ? C.emerald : result.solver_status ? C.coral : C.ink }}>{result.solver_status || "—"}</span></div>
                <div><span style={{ color: C.slate }}>Routes Generated:</span> {result.routes?.length ?? "—"}</div>
              </div>

              {result.status === "COMPLETED" && (
                <button 
                  onClick={handleViewRoutes}
                  style={{ background: C.ink, color: C.ivory, border: "none", padding: "8px 16px", borderRadius: 4, fontWeight: 600, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}
                >
                  <RouteIcon size={14} /> View Routes
                </button>
              )}

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
             <div style={{ color: C.coral, fontSize: 13, background: "rgba(194,59,46,0.1)", padding: 12, borderRadius: 4 }}>{error}</div>
          ) : (
             <div style={{ fontSize: 13, color: C.slate }}>No optimization runs found for this scenario. Ready to run.</div>
          )}
        </Panel>
      </div>
      {!running && result && result.metrics && (
        <div style={{ marginTop: 24 }}>
          <ResultComparison result={result} />
        </div>
      )}
    </div>
  );
}
