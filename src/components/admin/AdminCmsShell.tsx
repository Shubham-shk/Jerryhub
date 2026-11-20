import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  ArrowLeft,
  KeyRound,
  Layers,
  LayoutDashboard,
  Loader2,
  Package,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { DEMO_MODE } from "../../lib/config";

interface AdminCmsShellProps {
  title: string;
  description?: string;
  eyebrow?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Shared chrome for the Sets & Packs CMS. The admin route is only registered
 * for admins, but this guard also protects direct visits while auth resolves.
 */
export function AdminCmsShell({
  title,
  description,
  eyebrow = "Content manager",
  backTo,
  backLabel = "Back",
  actions,
  children,
}: AdminCmsShellProps) {
  const { isAdmin, profile, loading, login } = useAuth();

  async function handleLogin() {
    sessionStorage.setItem("lhh_post_login_path", "/admin/sets");
    await login();
  }

  if (loading) {
    return (
      <div className="admin-gate">
        <Loader2 size={28} className="spin" />
        <p>Checking admin access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-gate">
        <span className="admin-gate-icon"><KeyRound size={30} /></span>
        <p className="eyebrow">Restricted area</p>
        <h1>Admin access only.</h1>
        <p>
          This dashboard is limited to the site owner. Sign in with the admin Patreon
          account, or mark your profile as an admin in Supabase.
        </p>
        {profile ? (
          <Link to="/account" className="btn btn--primary">Go to my account</Link>
        ) : (
          <button type="button" className="btn btn--patreon" onClick={() => void handleLogin()}>
            Log in with Patreon
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <section className="page-hero page-hero--admin admin-cms-hero">
        <div className="container page-hero-inner">
          <div className="admin-cms-hero-row">
            <div className="admin-cms-hero-copy">
              {backTo ? (
                <Link className="admin-cms-back" to={backTo}>
                  <ArrowLeft size={14} /> {backLabel}
                </Link>
              ) : (
                <p className="eyebrow"><Layers size={14} /> {eyebrow}</p>
              )}
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </div>
            {actions && <div className="admin-cms-hero-actions">{actions}</div>}
          </div>
        </div>
      </section>

      <section className="section admin-section admin-cms-section">
        <div className="container">
          <nav className="admin-cms-nav" aria-label="Content manager">
            <NavLink to="/admin" end>
              <LayoutDashboard size={15} /> Dashboard
            </NavLink>
            <NavLink to="/admin/sets">
              <Layers size={15} /> Sets
            </NavLink>
            <NavLink to="/admin/packs">
              <Package size={15} /> Packs
            </NavLink>
          </nav>

          {DEMO_MODE && (
            <div className="admin-demo-notice">
              <Layers size={19} />
              <div>
                <strong>Demo mode.</strong> Connect Supabase and mark your profile as admin
                to create sets, packs and albums.
              </div>
            </div>
          )}

          {children}
        </div>
      </section>
    </>
  );
}
