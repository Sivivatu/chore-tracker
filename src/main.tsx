import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { router } from "./app/router";
import { AppProviders } from "./app/providers";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
      <SpeedInsights />
    </AppProviders>
  </StrictMode>,
);
