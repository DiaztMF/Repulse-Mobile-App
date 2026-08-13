import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    host: true, // reachable from a phone on the same network
    port: 5173,
    strictPort: true, // fail loudly rather than drift to another port
    allowedHosts: true, // allow ngrok / tunnel origins

    // Through an HTTPS tunnel the HMR client builds its socket target
    // from the page URL, where the port is empty — so the websocket
    // never connects and the page silently stops updating while still
    // looking fine. Pointing it at 443/wss fixes that but breaks plain
    // localhost, so it rides on `--mode tunnel` rather than an env var:
    // npm scripts run through cmd.exe on Windows, where `VAR=1 cmd` is
    // not valid syntax.
    hmr:
      mode === "tunnel"
        ? { clientPort: 443, protocol: "wss" as const }
        : undefined,
  },
}));
