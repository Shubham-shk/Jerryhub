import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AgeGate } from "./components/AgeGate";
import { useAgeGate } from "./context/AgeGateContext";
import { useAuth } from "./context/AuthContext";
import { AuthPromptModal } from "./components/AuthPromptModal";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { ToastViewport } from "./components/ToastViewport";
import { AccountPage } from "./pages/AccountPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { BrowsePage } from "./pages/BrowsePage";
import { ContentDetailsPage } from "./pages/ContentDetailsPage";
import { FAQPage } from "./pages/FAQPage";
import { LandingPage } from "./pages/LandingPage";
import { LegalPage } from "./pages/LegalPage";
import { NotFoundPage } from "./pages/NotFoundPage";

/**
 * The admin dashboard lives in its own JS chunk. Non-admins never download it
 * and the route is not registered for them, so /admin behaves like any other
 * unknown URL (404) instead of advertising a restricted area.
 */
const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })),
);

/**
 * Sets & Packs CMS. These pages are also admin-only and lazy-loaded so regular
 * visitors never download the management bundle.
 */
const AdminSetsPage = lazy(() =>
  import("./pages/admin/ContentManagerPages").then((module) => ({
    default: module.AdminSetsPage,
  })),
);
const AdminSetPage = lazy(() =>
  import("./pages/admin/ContentManagerPages").then((module) => ({
    default: module.AdminSetPage,
  })),
);
const AdminPacksPage = lazy(() =>
  import("./pages/admin/ContentManagerPages").then((module) => ({
    default: module.AdminPacksPage,
  })),
);
const AdminPackPage = lazy(() =>
  import("./pages/admin/ContentManagerPages").then((module) => ({
    default: module.AdminPackPage,
  })),
);

/**
 * The public image gallery is a full-page experience. It is lazy-loaded so the
 * viewer bundle stays out of the initial homepage payload.
 */
const GalleryPage = lazy(() =>
  import("./pages/GalleryPage").then((module) => ({ default: module.GalleryPage })),
);

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
  const { isAdmin, loading: authLoading } = useAuth();
  const minimal = location.pathname.startsWith("/auth/callback");
  // The gallery owns the full viewport: no site navbar or footer, just its own
  // compact header and back navigation.
  const gallery = location.pathname.startsWith("/gallery/");
  // Legal pages must stay readable before verification. Everything else is gated.
  const legal = location.pathname.startsWith("/legal/");
  const unlocked = verified || legal;
  const onAdminPath = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  // Wait for the session before deciding /admin is unknown, so an admin who
  // refreshes the page does not see a 404 flash.
  const resolvingAdmin = onAdminPath && authLoading;

  return (
    <div className="app">
      {unlocked ? (
        <>
          <ScrollToTop />
          {!minimal && !gallery && <Navbar />}

          <main
            className={
              minimal ? "main main--minimal" : gallery ? "main main--gallery" : "main"
            }
          >
            {resolvingAdmin ? (
              <div className="admin-gate">
                <Loader2 size={28} className="spin" />
                <p>Checking access…</p>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="admin-gate">
                    <Loader2 size={28} className="spin" />
                    <p>Loading…</p>
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/browse" element={<BrowsePage mode="all" />} />
                  <Route path="/trending" element={<BrowsePage mode="trending" />} />
                  <Route path="/newest" element={<BrowsePage mode="newest" />} />
                  <Route path="/content/:slug" element={<ContentDetailsPage />} />
                  <Route path="/release/:slug" element={<ContentDetailsPage />} />
                  <Route path="/gallery/:slug" element={<GalleryPage />} />
                  <Route path="/gallery/:slug/:assetId" element={<GalleryPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  {isAdmin && <Route path="/admin" element={<AdminPage />} />}
                  {isAdmin && <Route path="/admin/sets" element={<AdminSetsPage />} />}
                  {isAdmin && <Route path="/admin/sets/:setId" element={<AdminSetPage />} />}
                  {isAdmin && <Route path="/admin/packs" element={<AdminPacksPage />} />}
                  {isAdmin && <Route path="/admin/packs/:packId" element={<AdminPackPage />} />}
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/legal/:slug" element={<LegalPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            )}
          </main>

          {!minimal && !gallery && <Footer />}
          <AuthPromptModal />
          <ToastViewport />
        </>
      ) : null}
      {!verified && !legal && <AgeGate />}
    </div>
  );
}
