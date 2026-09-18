import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { C } from "../data/prototype/designTokens";
import { IMPACT, UTIL_TREND, RETURN_TREND } from "../data/prototype/demoData";
import { Panel } from "../components/shared/Panel";

export function ImpactPage() {
  return (
    <div style={{ padding: 26 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Impact</div>
      <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>Aggregate results across all optimization runs.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        <Panel title="Before vs After — Distance (km)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={IMPACT}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Bar dataKey="distance" fill={C.coral} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Before vs After — Cost (₹)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={IMPACT}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Bar dataKey="cost" fill={C.navy} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Utilization Trend">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={UTIL_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="run" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Line type="monotone" dataKey="util" stroke={C.coral} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Return Load Activity">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={RETURN_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
              <XAxis dataKey="run" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Area type="monotone" dataKey="loads" stroke={C.navy} fill={C.peach} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

