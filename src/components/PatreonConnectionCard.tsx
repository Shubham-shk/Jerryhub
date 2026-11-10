import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Link2,
  Link2Off,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { PatreonMark } from "./PatreonMark";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { DEMO_MODE } from "../lib/config";
import { accessLabel, resolveAccessLevel } from "../lib/access";
import {
  disconnectPatreon,
  fetchPatreonConnection,
  PatreonFunctionError,
  startPatreonConnect,
  syncPatreonConnection,
} from "../lib/api";
import type { PatreonConnection } from "../lib/types";

const REASON_MESSAGES: Record<string, string> = {
  cancelled: "Patreon authorization was cancelled. Nothing was changed.",
  invalid_state: "That connection link expired or was already used. Please start again.",
  missing_code: "Patreon did not return an authorization code. Please try again.",
  already_linked: "That Patreon account is already connected to another Jerryhub account.",
  different_account:
    "This Jerryhub account is already connected to a different Patreon account. Disconnect it first.",
  connect_failed: "We couldn't connect your Patreon account. Please try again.",
  reauth_required: "Patreon access expired or was revoked. Reconnect your account.",
  server_error: "Patreon connection is temporarily unavailable. Please try again.",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function patronStatusLabel(connection: PatreonConnection): string {
  if (connection.membership_status === "active") return "Active patron";
  switch (connection.patron_status) {
    case "declined_patron":
      return "Payment declined";
    case "former_patron":
      return "Cancelled / expired";
    default:
      return "Not active";
  }
}

/**
 * Account-page Patreon connection controls.
 *
 * The browser only reads non-sensitive status columns; tokens live server-side
 * and are used exclusively by the Edge Functions.
 */
export function PatreonConnectionCard() {
  const { profile, demoMode, refreshProfile } = useAuth();
  const { toast } = useUI();
  const [params, setParams] = useSearchParams();
  const [connection, setConnection] = useState<PatreonConnection | null>(null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const loadConnection = useCallback(async () => {
    if (DEMO_MODE) {
      setConnection(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setConnection(await fetchPatreonConnection());
    } catch (loadError) {
      console.error("Could not load Patreon connection:", loadError);
      setError("Could not load your Patreon connection. Please refresh the page or try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  // Handle the redirect back from patreon-callback.
  useEffect(() => {
    const status = params.get("patreon");
    if (!status) return;
    const reason = params.get("reason") ?? "";

    if (status === "connected") {
      toast("Patreon account connected. Membership verified.", "success");
      void refreshProfile();
      void loadConnection();
    } else if (status === "error") {
      setError(REASON_MESSAGES[reason] ?? REASON_MESSAGES.connect_failed);
    }

    const next = new URLSearchParams(params);
    next.delete("patreon");
    next.delete("reason");
    setParams(next, { replace: true });
  }, [params, setParams, toast, refreshProfile, loadConnection]);

  const connectionAccess = useMemo(() => {
    if (!connection) return "public" as const;
    return resolveAccessLevel({
      membershipStatus: connection.membership_status,
      entitledTierIds: connection.entitled_tier_ids ?? [],
      isAdmin: Boolean(profile?.is_admin),
      demoMode: false,
    });
  }, [connection, profile?.is_admin]);

  if (!profile) return null;

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      const url = await startPatreonConnect("/account");
      window.location.assign(url);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Could not start the Patreon connection.",
      );
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectPatreon();
      setConnection(null);
      setConfirming(false);
      await refreshProfile();
      toast("Patreon account disconnected. Membership access was cleared.", "success");
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Could not disconnect Patreon. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    setError(null);
    try {
      const result = await syncPatreonConnection();
      setConnection(result.connection ?? null);
      await refreshProfile();
      toast("Patreon membership refreshed.", "success");
    } catch (syncError) {
      if (syncError instanceof PatreonFunctionError && syncError.code === "reauth_required") {
        setConnection(null);
        setError(REASON_MESSAGES.reauth_required);
        await refreshProfile();
      } else {
        setError(
          syncError instanceof Error
            ? syncError.message
            : "Could not refresh your Patreon membership.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="patreon-connect" aria-labelledby="patreon-connect-title">
      <div className="patreon-connect-head">
        <span className="patreon-connect-icon">
          {connection?.patreon_avatar_url ? (
            <img src={connection.patreon_avatar_url} alt="" />
          ) : (
            <PatreonMark size={22} />
          )}
        </span>
        <div>
          <p className="eyebrow">Patreon connection</p>
          <h3 id="patreon-connect-title">
            {connection ? "Patreon account connected" : "Connect your Patreon account"}
          </h3>
          <p>
            {connection
              ? "Your membership is verified directly with Patreon. Tokens stay on the server and are never exposed to the browser."
              : "Link the Patreon account that holds your membership. We verify your tier server-side and never see or store your payment details."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="patreon-connect-loading">
          <Loader2 size={16} className="spin" />
          <span>Checking your Patreon connection…</span>
        </div>
      ) : connection ? (
        <div className="patreon-connect-body">
          <div className="patreon-connect-grid">
            <div>
              <span>Patreon account</span>
              <strong>
                {connection.patreon_full_name ||
                  connection.patreon_email ||
                  connection.patreon_user_id}
              </strong>
            </div>
            <div>
              <span>Membership</span>
              <strong>{patronStatusLabel(connection)}</strong>
            </div>
            <div>
              <span>Access level</span>
              <strong>{accessLabel(connectionAccess)}</strong>
            </div>
            <div>
              <span>Connected</span>
              <strong>{formatDate(connection.connected_at)}</strong>
            </div>
          </div>

          <div className="patreon-connect-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void handleSync()}
              disabled={busy}
            >
              <RefreshCw size={15} className={busy ? "spin" : ""} /> Refresh membership
            </button>

            {confirming ? (
              <>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => void handleDisconnect()}
                  disabled={busy}
                >
                  {busy ? <Loader2 size={15} className="spin" /> : <Link2Off size={15} />}
                  Yes, disconnect
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirming(true)}
                disabled={busy}
              >
                <Link2Off size={15} /> Disconnect Patreon
              </button>
            )}
          </div>
          {confirming && (
            <p className="patreon-connect-note">
              Disconnecting removes the stored Patreon tokens and clears your membership
              access. Your Jerryhub account stays intact.
            </p>
          )}
        </div>
      ) : (
        <div className="patreon-connect-body">
          <div className="patreon-connect-actions">
            <button
              type="button"
              className="btn btn--patreon btn--sm"
              onClick={() => void handleConnect()}
              disabled={busy || demoMode}
            >
              {busy ? <Loader2 size={15} className="spin" /> : <Link2 size={15} />}
              Connect Patreon
            </button>
          </div>
          <p className="patreon-connect-note">
            {demoMode
              ? "Connect Patreon becomes available once Supabase is configured."
              : "You'll be redirected to Patreon to authorize Jerryhub. You can disconnect at any time."}
          </p>
        </div>
      )}

      {error && (
        <p className="patreon-connect-error" role="alert">
          <AlertTriangle size={14} /> {error}
        </p>
      )}

      {connection?.membership_status === "active" && connectionAccess !== "public" && (
        <p className="patreon-connect-verified">
          <Check size={13} /> Verified via Patreon · access synced to your account
        </p>
      )}
    </section>
  );
}
