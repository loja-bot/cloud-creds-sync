import React, { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  opacity?: number;
  blur?: boolean;
}

// Detecta dispositivo de baixa potência para evitar travamentos.
const isLowPowerDevice = () => {
  if (typeof navigator === "undefined") return false;
  // @ts-ignore
  const mem = (navigator as any).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return mem <= 3 || cores <= 4 || reduce;
};

const VideoBackground: React.FC<Props> = ({ src, opacity = 0.35, blur = false }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [lowPower] = useState(isLowPowerDevice);

  // Só carrega/toca quando estiver na viewport (economia de buffer/CPU).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setVisible(e.isIntersecting)),
      { rootMargin: "100px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (visible && !lowPower) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [visible, lowPower]);

  if (lowPower) {
    // Fallback estático em devices fracos: gradiente, zero CPU.
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, hsla(135,100%,50%,0.18), transparent 60%), radial-gradient(circle at 70% 80%, hsla(135,100%,40%,0.12), transparent 55%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/90" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {visible && (
        <video
          ref={ref}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity,
            // Removido blur (re-amostra cada frame, trava mobile).
            filter: blur ? "saturate(1.2)" : "saturate(1.1)",
            willChange: "opacity",
            transform: "translateZ(0)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/90" />
    </div>
  );
};

export default VideoBackground;
