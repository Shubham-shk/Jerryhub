/**
 * CORS is restricted to the configured Jerryhub origins. `APP_URL` is always
 * allowed, `ALLOWED_ORIGINS` can add more (for example the apex + www domain),
 * and local Vite ports are added only when `APP_URL` itself is local.
 */
function appOrigin(): string | null {
  const value = optionalEnv("APP_URL").replace(/\/+$/, "");
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function allowedOrigins(): string[] {
  const origins = new Set<string>();

  const app = appOrigin();
  if (app) {
    origins.add(app);
    // Allow the apex/www twin of the configured site automatically.
    try {
      const url = new URL(app);
      if (url.hostname.startsWith("www.")) {
        origins.add(`${url.protocol}//${url.hostname.slice(4)}${url.port ? `:${url.port}` : ""}`);
      } else {
        origins.add(`${url.protocol}//www.${url.hostname}${url.port ? `:${url.port}` : ""}`);
      }
    } catch {
      // Ignore malformed APP_URL; the exact origin is still allowed above.
    }
  }

  for (const entry of optionalEnv("ALLOWED_ORIGINS").split(",")) {
    const value = entry.trim();
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // Ignore malformed allowlist entries instead of failing every request.
    }
  }

  // Local development only. Adding these to a production deployment would
  // needlessly widen the browser allowlist, so gate them on a local APP_URL.
  const appHost = app ? new URL(app).hostname : "";
  const isLocalApp = !app || appHost === "localhost" || appHost === "127.0.0.1";
  if (isLocalApp) {
    for (const local of LOCAL_ORIGINS) {
      origins.add(local);
    }
  }

  return [...origins];
}

const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
];

export function corsHeadersFor(request?: Request): Record<string, string> {
  const requestOrigin = request?.headers.get("origin") ?? "";
  const allowed = allowedOrigins();
  // Only echo a configured (non-local) origin. Falling back to a localhost
  // origin would break real deployments that have not set APP_URL, so fall
  // back to `*` in that case, which matches the previous behavior.
  const configured = allowed.filter((origin) => !LOCAL_ORIGINS.includes(origin));
  const allowOrigin = requestOrigin && allowed.includes(requestOrigin)
    ? requestOrigin
    : configured[0] ?? "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Default header set for calls that do not pass the original Request. */
export const corsHeaders: Record<string, string> = corsHeadersFor();

export function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
  request?: Request,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function preflight(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(request) });
  }
  return null;
}

export function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
    },
  });
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function optionalEnv(name: string): string {
  return Deno.env.get(name)?.trim() ?? "";
}

export function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected server error";
}

/** Extracts a bearer token from the Authorization header. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}
