import type { ReactNode } from "react";
import { useRef, useState, useEffect } from "react";

export function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, shown] as const;
}

export const Reveal = ({ children, delay = 0 }: { children: ReactNode, delay?: number }) => {
  const [ref, shown] = useReveal();
  return (
    <div ref={ref} className={`c-reveal ${shown ? "shown" : ""}`} style={{ transitionDelay: delay > 0 ? `${delay}s` : undefined }}>
      {children}
    </div>
  );
};
