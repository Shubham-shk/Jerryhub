import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "lhh_age_verified_v1";

interface AgeGateContextValue {
  verified: boolean;
  accept: () => void;
  reset: () => void;
}

const AgeGateContext = createContext<AgeGateContextValue | null>(null);

function readConsent(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function AgeGateProvider({ children }: { children: ReactNode }) {
  const [verified, setVerified] = useState(readConsent);

  const accept = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Storage can be unavailable in strict privacy modes. The gate still
      // dismisses for this session.
    }
    setVerified(true);
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setVerified(false);
  }, []);

  const value = useMemo(() => ({ verified, accept, reset }), [verified, accept, reset]);
  return <AgeGateContext.Provider value={value}>{children}</AgeGateContext.Provider>;
}

export function useAgeGate(): AgeGateContextValue {
  const context = useContext(AgeGateContext);
  if (!context) throw new Error("useAgeGate must be used inside <AgeGateProvider>.");
  return context;
}

export function detectRegion(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (!tz) return "your location";
    const parts = tz.split("/");
    return parts.length > 1 ? parts.slice(1).join(" / ").replace(/_/g, " ") : tz;
  } catch {
    return "your location";
  }
}
