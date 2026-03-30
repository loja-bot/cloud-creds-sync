import React, { useState, useCallback } from "react";
import { Cast } from "lucide-react";
import { toast } from "sonner";

interface CastButtonProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  className?: string;
}

/**
 * Cast button using the browser's Remote Playback API.
 * Works with Chromecast (Chrome) and AirPlay (Safari).
 * Falls back to the Presentation API for broader support.
 */
const CastButton: React.FC<CastButtonProps> = ({ videoRef, className = "" }) => {
  const [casting, setCasting] = useState(false);

  const handleCast = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // Method 1: Remote Playback API (Chromecast / AirPlay)
    if ("remote" in video && video.remote) {
      try {
        const remote = video.remote as any;
        if (remote.state === "connected" || remote.state === "connecting") {
          await remote.cancelWatchAvailability();
          toast.info("Transmissão desconectada");
          setCasting(false);
          return;
        }
        await remote.prompt();
        setCasting(true);
        toast.success("Conectado à TV!");

        remote.addEventListener("disconnect", () => {
          setCasting(false);
          toast.info("Desconectado da TV");
        });
        return;
      } catch (e: any) {
        if (e.name === "NotSupportedError") {
          // Fall through to other methods
        } else if (e.name !== "NotAllowedError") {
          console.warn("Remote playback error:", e);
        }
      }
    }

    // Method 2: AirPlay (Safari specific)
    if ((video as any).webkitShowPlaybackTargetPicker) {
      try {
        (video as any).webkitShowPlaybackTargetPicker();
        setCasting(true);
        return;
      } catch (e) {
        console.warn("AirPlay error:", e);
      }
    }

    // Method 3: Presentation API (broader support)
    if ("presentation" in navigator && (navigator as any).presentation) {
      try {
        const presentationRequest = new (window as any).PresentationRequest([video.src || video.currentSrc]);
        const connection = await presentationRequest.start();
        if (connection) {
          setCasting(true);
          toast.success("Conectado via Presentation API!");
          connection.addEventListener("close", () => setCasting(false));
        }
        return;
      } catch (e: any) {
        if (e.name !== "NotAllowedError") {
          console.warn("Presentation API error:", e);
        }
      }
    }

    toast.error("Nenhum dispositivo encontrado. Verifique se sua TV está na mesma rede WiFi ou use um Chromecast/Apple TV.");
  }, [videoRef]);

  return (
    <button
      onClick={handleCast}
      className={`w-10 h-10 rounded-full bg-card/60 flex items-center justify-center transition-colors ${
        casting ? "ring-2 ring-primary" : ""
      } ${className}`}
      title={casting ? "Desconectar da TV" : "Transmitir para TV"}
    >
      <Cast className={`w-5 h-5 ${casting ? "text-primary" : "text-foreground"}`} />
    </button>
  );
};

export default CastButton;
