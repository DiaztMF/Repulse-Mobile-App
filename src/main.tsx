import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { AuthProvider } from "./firebase/auth";
import { StoreProvider } from "./data/store";
import { ThemeProvider } from "./state/theme";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <StoreProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </StoreProvider>
    </AuthProvider>
  </StrictMode>,
);
