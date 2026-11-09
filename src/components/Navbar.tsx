import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  Compass,
  Flame,
  Gamepad2,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { BASIC_PRICE_LABEL, FULL_PRICE_LABEL } from "../lib/config";
import { Logo } from "./Logo";
import { PatreonMark } from "./PatreonMark";
import { StatusPill } from "./StatusPill";

const navItems = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/browse", label: "Browse", icon: Compass },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/newest?category=games", label: "2D Games", icon: Gamepad2 },
  { to: "/newest?category=comics", label: "Manga + Comics", icon: BookOpen },
];

export function Navbar() {
  const {
    profile,
    loading,
    isPatron,
    isBasic,
    isFullAccess,
    isAdmin,
    login,
    logout,
    demoMode,
  } = useAuth();
  const { openAuthModal, toast } = useUI();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileTop, setMobileTop] = useState(80);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const menuRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);

      if (y < 90) {
        setHidden(false);
      } else if (!mobileOpen && Math.abs(y - lastY) > 8) {
        setHidden(y > lastY);
      }

      lastY = y;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) setHidden(false);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", mobileOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  }

  async function handleLogin() {
    sessionStorage.setItem("lhh_post_login_path", location.pathname);
    await login();
    if (demoMode) {
      setMobileOpen(false);
      toast("Demo mode: signed in with Full Access.", "success");
    }
  }

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    toast("You have been signed out.");
    navigate("/");
  }

  function toggleMobile() {
    const next = !mobileOpen;
    if (next) {
      const rect = navRef.current?.getBoundingClientRect();
      setMobileTop(rect ? Math.round(rect.bottom + 10) : 80);
    }
    setMobileOpen(next);
  }

  const initials = (profile?.full_name || profile?.email || "P")
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className={`nav-floating-outer${scrolled ? " is-scrolled" : ""}${hidden ? " is-hidden" : ""}`}>
      <header className="nav-floating-bar" ref={navRef}>
        {/* Cool Logo */}
        <Logo />

        {/* Floating Centered Nav Links */}
        <nav className="nav-links" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : item.to.includes("category=")
                ? location.search.includes(item.to.split("?")[1])
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`nav-link${isActive ? " is-active" : ""}`}
              >
                <item.icon size={13} className="nav-link-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Action Cluster */}
        <div className="nav-actions">
          {/* Quick Search */}
          <div className={`nav-search-wrap${searchOpen ? " is-expanded" : ""}`}>
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="nav-search-form">
                <Search size={14} className="nav-search-icon" />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search titles, games, anime..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="nav-search-input"
                  autoFocus
                />
                <button
                  type="button"
                  className="nav-search-close"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                >
                  <X size={14} />
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="icon-btn nav-search-trigger"
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                aria-label="Search content"
                title="Search Library"
              >
                <Search size={15} />
              </button>
            )}
          </div>

          <span className="age-chip" title="Adults only 18+">
            18+
          </span>

          {loading ? (
            <span className="nav-loading" aria-label="Loading account" />
          ) : profile ? (
            <div className="avatar-wrap" ref={menuRef}>
              <button
                type="button"
                className="avatar-btn"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="avatar-img" />
                ) : (
                  <span className="avatar-initials">{initials}</span>
                )}
                <span className={`avatar-status${isPatron ? " is-active" : ""}`} />
                <ChevronDown size={13} className="avatar-chevron" />
              </button>

              {menuOpen && (
                <div className="avatar-menu" role="menu">
                  <div className="avatar-menu-head">
                    <p className="avatar-menu-name">{profile.full_name || "Patron"}</p>
                    <p className="avatar-menu-email">{profile.email}</p>
                    <StatusPill status={profile.membership_status} />
                    {(isBasic || isFullAccess) && (
                      <span className={`avatar-menu-plan${isFullAccess ? " is-full" : ""}`}>
                        {isFullAccess ? "Full Access" : "Basic Access"}
                      </span>
                    )}
                  </div>
                  <Link to="/account" className="avatar-menu-item" role="menuitem">
                    <UserRound size={16} /> Account &amp; Membership
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="avatar-menu-item" role="menuitem">
                      <LayoutDashboard size={16} /> Admin Dashboard
                    </Link>
                  )}
                  {!isPatron && (
                    <button
                      type="button"
                      className="avatar-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        openAuthModal("inactive");
                      }}
                    >
                      <ShieldCheck size={16} /> Restore Access
                    </button>
                  )}
                  <button
                    type="button"
                    className="avatar-menu-item avatar-menu-item--danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--patreon btn--sm nav-login"
              onClick={handleLogin}
              aria-label="Sign in with Patreon"
            >
              <PatreonMark size={15} />
              <span>Sign in</span>
            </button>
          )}

          <button
            type="button"
            className="icon-btn mobile-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={toggleMobile}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileOpen &&
        createPortal(
          <div className="mobile-menu" style={{ top: mobileTop }}>
            {/* Quick Search inside mobile drawer */}
            <form onSubmit={handleSearchSubmit} className="mobile-search-form">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search releases, games, manga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            <nav className="mobile-menu-links" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `mobile-menu-link${isActive ? " is-active" : ""}`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}

              <Link to="/account" className="mobile-menu-link">
                <UserRound size={18} />
                <span>My Account</span>
              </Link>

              {isAdmin && (
                <Link to="/admin" className="mobile-menu-link">
                  <LayoutDashboard size={18} />
                  <span>Admin Vault</span>
                </Link>
              )}
            </nav>

            <div className="mobile-menu-footer">
              {!profile ? (
                <button type="button" className="btn btn--patreon btn--block btn--lg" onClick={handleLogin}>
                  <PatreonMark size={18} /> Sign in with Patreon
                </button>
              ) : (
                <Link to="/account" className="btn btn--primary btn--block">
                  Manage Membership
                </Link>
              )}
              <p className="mobile-menu-note">
                {isPatron
                  ? `${isFullAccess ? "Full Access" : "Basic Access"} active · Verified via Patreon`
                  : `Premium anime & game archive · Basic ${BASIC_PRICE_LABEL} / Full ${FULL_PRICE_LABEL}`}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
