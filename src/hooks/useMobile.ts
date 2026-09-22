import { useState, useEffect } from "react";

/**
 * Standardized responsive breakpoint hook for CargoSync.
 * Mobile layout triggers at <= 768px to ensure consistency 
 * between AppShell navigation and data-dense overlay drawers.
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}
