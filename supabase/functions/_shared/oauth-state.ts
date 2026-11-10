import { base64UrlToBytes, bytesToBase64Url } from "./crypto.ts";
import { requiredEnv } from "./http.ts";

export interface LoginState {
  returnTo: string;
  iat: number;
  nonce: string;
  /** The exact redirect_uri used in the authorize request. */
  redirectUri?: string;
}

const MAX_STATE_AGE_SECONDS = 15 * 60;

async function stateKey(): Promise<CryptoKey> {
  const secret = requiredEnv("PATREON_STATE_SECRET");
  if (secret.length < 32) {
    throw new Error("PATREON_STATE_SECRET must be at least 32 characters.");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Signs the login-flow state. The connect flow uses a DB-backed random state. */
export async function signLoginState(payload: LoginState): Promise<string> {
  const body = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await stateKey(),
    new TextEncoder().encode(body),
  );
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyLoginState(value: string): Promise<LoginState> {
  if (!value || value.length > 4096) throw new Error("Malformed state.");
  const [body, signature] = value.split(".");
  if (!body || !signature) throw new Error("Malformed state.");

  const valid = await crypto.subtle.verify(
    "HMAC",
    await stateKey(),
    base64UrlToBytes(signature),
    new TextEncoder().encode(body),
  );
  if (!valid) throw new Error("Invalid state signature.");

  const parsed = JSON.parse(
    new TextDecoder().decode(base64UrlToBytes(body)),
  ) as LoginState;

  if (!parsed.returnTo || typeof parsed.returnTo !== "string") {
    throw new Error("State is missing a return URL.");
  }
  if (
    !Number.isFinite(parsed.iat) ||
    Date.now() / 1000 - parsed.iat > MAX_STATE_AGE_SECONDS
  ) {
    throw new Error("Login state has expired.");
  }
  if (parsed.redirectUri !== undefined && typeof parsed.redirectUri !== "string") {
    throw new Error("State has an invalid redirect URI.");
  }
  return parsed;
}
