// PWA registration with iframe/preview guards + helpers for fullscreen + orientation lock
import { registerSW } from "virtual:pwa-register";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = typeof window !== "undefined" ? window.location.hostname : "";
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("preview--") ||
  host.endsWith(".lovableproject.com") ||
  host.endsWith(".lovableproject-dev.com");

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

export function initPwa() {
  if (typeof window === "undefined") return;

  if (isInIframe || isPreviewHost) {
    // Defensive: remove any previously-installed SW in preview/iframe contexts
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    }
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      try {
        updateSW?.(true);
      } catch {}
    },
    onRegisteredSW(swUrl) {
      // eslint-disable-next-line no-console
      console.log("[PWA] registered:", swUrl);
    },
    onRegisterError(err) {
      // eslint-disable-next-line no-console
      console.warn("[PWA] register error", err);
    },
  });
}

// --- Install prompt handling ---
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BIPEvent | null = null;
const listeners = new Set<(canInstall: boolean) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BIPEvent;
    listeners.forEach((cb) => cb(true));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((cb) => cb(false));
  });
}

export function onInstallAvailability(cb: (canInstall: boolean) => void) {
  listeners.add(cb);
  cb(!!deferredPrompt);
  return () => listeners.delete(cb);
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((cb) => cb(false));
  return choice.outcome;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    // @ts-ignore
    window.navigator.standalone === true
  );
}

export async function requestFullscreenAndLandscape() {
  try {
    const el = document.documentElement as any;
    if (!document.fullscreenElement) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req) await req.call(el);
    }
  } catch {}
  try {
    // Screen Orientation API
    const orient = (screen as any).orientation;
    if (orient && typeof orient.lock === "function") {
      await orient.lock("landscape").catch(() => {});
    }
  } catch {}
}
