import { useState, useEffect, useRef } from "react";
import { C, mono } from "../../data/prototype/designTokens";
import { heroNetworkData, HERO_STAGES } from "../../data/prototype/demoData";

function useHeroStage() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setI((v) => (v + 1) % HERO_STAGES.length), HERO_STAGES[i].dur);
    return () => clearTimeout(t);
  }, [i]);
  return HERO_STAGES[i].key;
}

export function HeroNetwork() {
  const stage = useHeroStage();
  const { depot, orders, clusters, vehicle, returnLoad } = heroNetworkData;
  const stageIdx = HERO_STAGES.findIndex((s) => s.key === stage);

  const grouped = stageIdx >= 1;
  const routeDrawn = stageIdx >= 3;
  const showReturn = stageIdx >= 5;
  const returnHighlighted = stageIdx >= 6;

  const pathAB = `M${depot.x},${depot.y} L${clusters.A.x},${clusters.A.y} L${clusters.B.x},${clusters.B.y}`;
  const pathReturn = `M${clusters.B.x},${clusters.B.y} L${depot.x},${depot.y}`;
  const [truckPos, setTruckPos] = useState({ x: depot.x, y: depot.y });
  const abRef = useRef<SVGPathElement>(null);
  const retRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    let raf: number; let start: number;
    const durOut = 1800, durRet = 1600;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const el = ts - start;
      if (stage === "delivery" && abRef.current) {
        const len = abRef.current.getTotalLength();
        const p = abRef.current.getPointAtLength(Math.min(el / durOut, 1) * len);
        setTruckPos({ x: p.x, y: p.y });
        if (el < durOut) raf = requestAnimationFrame(animate);
      } else if ((stage === "returnload" || stage === "result") && retRef.current) {
        const len = retRef.current.getTotalLength();
        const p = retRef.current.getPointAtLength(Math.min(el / durRet, 1) * len);
        setTruckPos({ x: p.x, y: p.y });
        if (el < durRet) raf = requestAnimationFrame(animate);
      }
    };
    if (stage === "delivery" || stage === "returnload" || stage === "result") {
      raf = requestAnimationFrame(animate);
    } else if (stageIdx < 3) {
      setTruckPos({ x: depot.x, y: depot.y });
    } else if (stage === "route" || stage === "capacity") {
      setTruckPos({ x: depot.x, y: depot.y });
    }
    return () => cancelAnimationFrame(raf);
  }, [stage, stageIdx]);

  return (
    <div>
      <svg viewBox="0 0 420 320" style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <path ref={abRef} d={pathAB} fill="none" stroke="none" />
        <path ref={retRef} d={pathReturn} fill="none" stroke="none" />

        <path d={pathAB} fill="none" stroke={routeDrawn ? C.coral : C.stone} strokeWidth={routeDrawn ? 2 : 1.2}
          strokeDasharray={routeDrawn ? "0" : "4 5"} style={{ transition: "stroke 0.5s, stroke-width 0.5s" }} />
        {showReturn && (
          <path d={pathReturn} fill="none" stroke={returnHighlighted ? C.coral : C.slate} strokeWidth={returnHighlighted ? 2 : 1.2}
            strokeDasharray={returnHighlighted ? "0" : "3 5"} opacity={returnHighlighted ? 0.9 : 0.5} />
        )}

        <circle cx={depot.x} cy={depot.y} r="7" fill={C.navy} />
        <text x={depot.x - 8} y={depot.y + 22} fontSize="9" fontFamily={mono} fill={C.slate}>DEPOT</text>

        {orders.map((o) => {
          const target = o.cluster ? clusters[o.cluster as keyof typeof clusters] : { x: o.x, y: o.y };
          const cx = grouped ? target.x + (o.x - target.x) * 0.15 : o.x;
          const cy = grouped ? target.y + (o.y - target.y) * 0.15 : o.y;
          const isNoise = !o.cluster;
          return (
            <circle key={o.id} cx={cx} cy={cy} r={isNoise ? 3 : 4}
              fill={isNoise ? "none" : grouped ? C.coral : C.ivory}
              stroke={isNoise ? C.slate : C.navy} strokeOpacity={isNoise ? 0.4 : 1} strokeWidth="1.2"
              style={{ transition: "cx 0.9s ease, cy 0.9s ease, fill 0.5s" }} />
          );
        })}

        {stageIdx >= 2 && (
          <g style={{ transition: "transform 0.05s linear" }} transform={`translate(${truckPos.x},${truckPos.y})`}>
            <circle r="7" fill={C.coral} />
            <circle r="13" fill={C.coral} opacity="0.15" />
          </g>
        )}
      </svg>

      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: mono, fontSize: 11, color: "rgba(250,246,239,0.65)" }}>
        <span>{vehicle.id}</span>
        <span>
          {stage === "orders" && "7 orders placed"}
          {stage === "dbscan" && "2 clusters found · 1 outlier"}
          {stage === "capacity" && "920 / 1200 kg · 77%"}
          {stage === "route" && "Route generated via OR-Tools"}
          {stage === "delivery" && "Delivering to Cluster B"}
          {stage === "returnload" && `${returnLoad.id} · ${returnLoad.weightKg} kg compatible`}
          {stage === "result" && "RETURN LOAD ASSIGNED"}
        </span>
      </div>
      <div style={{ height: 3, background: "rgba(250,246,239,0.12)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
        <div style={{
          width: `${((stageIdx + 1) / HERO_STAGES.length) * 100}%`, height: "100%", background: C.coral,
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

