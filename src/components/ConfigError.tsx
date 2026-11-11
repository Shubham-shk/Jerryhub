import { BRAND_NAME } from "../lib/config";

/**
 * Shown when the production bundle was built without valid Supabase
 * credentials. Demo Mode is disabled in production, so instead of silently
 * signing someone into a fake account we stop and explain exactly what is
 * missing.
 */
export function ConfigErrorScreen() {
  return (
    <div className="config-error" role="alert">
      <div className="config-error-card">
        <span className="config-error-badge">Configuration error</span>
        <h1>{BRAND_NAME} is not connected to Supabase.</h1>
        <p>
          Secure sign-in cannot start because this build was created without a
          Supabase URL or anonymous key. Demo Mode is disabled outside local
          development, so no account was created.
        </p>
        <p>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          in the hosting provider, then rebuild and redeploy. Vite embeds these
          values at build time.
        </p>
        <p className="config-error-note">
          Expected project: <code>cbtqiukcdbzeuitxiohl.supabase.co</code>
        </p>
      </div>
    </div>
  );
}
