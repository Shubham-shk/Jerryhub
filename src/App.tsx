import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AgeGate } from "./components/AgeGate";
import { useAgeGate } from "./context/AgeGateContext";
import { AuthPromptModal } from "./components/AuthPromptModal";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { ToastViewport } from "./components/ToastViewport";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { BrowsePage } from "./pages/BrowsePage";
import { ContentDetailsPage } from "./pages/ContentDetailsPage";
import { FAQPage } from "./pages/FAQPage";
import { LandingPage } from "./pages/LandingPage";
import { LegalPage } from "./pages/LegalPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname, hash]);

  useEffect(() => {
    function handleAnchorClick(e: globalThis.MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (href && href.startsWith("#") && href.length > 1) {
        const id = href.slice(1);
        const el = document.getElementById(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.pushState(null, "", href);
        }
      }
    }
    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  return null;
}

export default function App() {
  const location = useLocation();
  const { verified } = useAgeGate();
  const minimal = location.pathname.startsWith("/auth/callback");
  // Legal pages must stay readable before verification. Everything else is gated.
  const legal = location.pathname.startsWith("/legal/");
  const unlocked = verified || legal;

  return (
    <div className="app">
      {unlocked ? (
        <>
          <ScrollToTop />
          {!minimal && <Navbar />}

          <main className={minimal ? "main main--minimal" : "main"}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/browse" element={<BrowsePage mode="all" />} />
              <Route path="/trending" element={<BrowsePage mode="trending" />} />
              <Route path="/newest" element={<BrowsePage mode="newest" />} />
              <Route path="/content/:slug" element={<ContentDetailsPage />} />
              <Route path="/release/:slug" element={<ContentDetailsPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {!minimal && <Footer />}
          <AuthPromptModal />
          <ToastViewport />
        </>
      ) : null}
      {!verified && !legal && <AgeGate />}
    </div>
  );
}
