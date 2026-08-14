import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { AuthProvider } from "./firebase/auth";
import { StoreProvider } from "./data/store";
import { ThemeProvider } from "./state/theme";
import { MonitorProvider } from "./state/monitor";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <StoreProvider>
        <ThemeProvider>
          <MonitorProvider>
            <RouterProvider router={router} />
          </MonitorProvider>
        </ThemeProvider>
      </StoreProvider>
    </AuthProvider>
  </StrictMode>,
);
