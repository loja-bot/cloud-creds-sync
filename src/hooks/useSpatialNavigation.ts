import { useEffect, useCallback, useRef } from "react";

// Spatial navigation for D-Pad / TV remote
export function useSpatialNavigation(containerRef: React.RefObject<HTMLElement | null>) {
  const focusedIndex = useRef(0);

  const getFocusables = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>("[data-focusable]"));
  }, [containerRef]);

  const setFocus = useCallback((index: number) => {
    const els = getFocusables();
    if (!els.length) return;
    els.forEach((el) => el.classList.remove("focused"));
    const clamped = Math.max(0, Math.min(index, els.length - 1));
    focusedIndex.current = clamped;
    const el = els[clamped];
    el.classList.add("focused");
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [getFocusables]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const els = getFocusables();
      if (!els.length) return;

      let idx = focusedIndex.current;
      // Estimate grid columns from element positions
      const firstRect = els[0]?.getBoundingClientRect();
      const cols = els.filter(
        (el) => Math.abs(el.getBoundingClientRect().top - (firstRect?.top ?? 0)) < 10
      ).length || 1;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          idx = Math.min(idx + cols, els.length - 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          idx = Math.max(idx - cols, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          idx = Math.min(idx + 1, els.length - 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          idx = Math.max(idx - 1, 0);
          break;
        case "Enter":
          e.preventDefault();
          els[idx]?.click();
          return;
        default:
          return;
      }
      setFocus(idx);
    };

    window.addEventListener("keydown", handler);
    // Set initial focus
    setTimeout(() => setFocus(0), 100);
    return () => window.removeEventListener("keydown", handler);
  }, [getFocusables, setFocus]);

  return { setFocus, getFocusables };
}
