import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPwa } from "./lib/pwa";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker (no-op inside iframe / Lovable preview)
initPwa();
