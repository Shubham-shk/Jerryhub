import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { DEMO_MODE } from "../lib/config";
import { supabase } from "../lib/supabase";

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (DEMO_MODE) {
      navigate("/account", { replace: true });
      return;
    }

    const oauthError = params.get("error");
    const oauthMessage = params.get("error_description") || params.get("message");
    if (oauthError) {
      setError(oauthMessage || "Patreon sign-in was cancelled or failed.");
      return;
    }

    const tokenHash = params.get("token_hash");
    const type = params.get("type") || "magiclink";

    if (!tokenHash) {
      setError("The login link is missing its verification token. Please start again.");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: type as "magiclink" })
      .then(async ({ error: verifyError }) => {
        if (verifyError) {
          setError(verifyError.message);
          return;
        }
        await refreshProfile();
        const next = sessionStorage.getItem("lhh_post_login_path") || "/account";
        sessionStorage.removeItem("lhh_post_login_path");
        navigate(next, { replace: true });
      })
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : "Could not verify the login.");
      });
  }, [navigate, params, refreshProfile]);

  async function retry() {
    setError(null);
    started.current = false;
    await login("/auth/callback");
  }

  return (
    <div className="auth-callback">
      <div className="auth-callback-card">
        <Logo />
        {error ? (
          <>
            <span className="auth-callback-icon is-error"><AlertTriangle size={28} /></span>
            <p className="eyebrow">Verification failed</p>
            <h1>We couldn&apos;t finish signing you in.</h1>
            <p className="auth-callback-copy">{error}</p>
            <div className="auth-callback-actions">
              <button type="button" className="btn btn--primary" onClick={() => void retry()}>
                Try Patreon again <ArrowRight size={16} />
              </button>
              <Link to="/" className="btn btn--ghost">Back to home</Link>
            </div>
            <p className="auth-callback-note">
              <ShieldAlert size={13} /> Your session was not created. No access was granted.
            </p>
          </>
        ) : (
          <>
            <span className="auth-callback-icon"><Loader2 size={28} className="spin" /></span>
            <p className="eyebrow">Verifying with Patreon</p>
            <h1>Checking your membership…</h1>
            <p className="auth-callback-copy">
              We&apos;re confirming your current Patreon tier and preparing your private session.
              This usually takes a second.
            </p>
            <div className="auth-callback-steps">
              <span className="is-done">Patreon identity received</span>
              <span className="is-current">Verifying tier entitlement</span>
              <span>Unlocking your library</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
