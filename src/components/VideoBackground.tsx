import React from "react";

interface Props {
  src: string;
  opacity?: number;
  blur?: boolean;
}

const VideoBackground: React.FC<Props> = ({ src, opacity = 0.35, blur = true }) => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity,
          filter: blur ? "blur(2px) saturate(1.2)" : "saturate(1.1)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/90" />
    </div>
  );
};

export default VideoBackground;
