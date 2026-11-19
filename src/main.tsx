import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ConfigErrorScreen } from "./components/ConfigError";
import { AgeGateProvider } from "./context/AgeGateContext";
import { AuthProvider } from "./context/AuthContext";
import { SiteAssetsProvider } from "./context/SiteAssetsContext";
import { UIProvider } from "./context/UIContext";
import { CONFIG_ERROR } from "./lib/config";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {CONFIG_ERROR ? (
      <ConfigErrorScreen />
    ) : (
      <BrowserRouter>
        <AgeGateProvider>
          <AuthProvider>
            <SiteAssetsProvider>
              <UIProvider>
                <App />
              </UIProvider>
            </SiteAssetsProvider>
          </AuthProvider>
        </AgeGateProvider>
      </BrowserRouter>
    )}
  </StrictMode>,
);
