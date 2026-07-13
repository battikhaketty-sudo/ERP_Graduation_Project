import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { PreferencesProvider } from "./context/PreferencesContext";
import { router } from "./router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PreferencesProvider>
      <RouterProvider router={router} />
    </PreferencesProvider>
  </StrictMode>,
);
