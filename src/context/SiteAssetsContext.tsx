import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchSiteAssets } from "../lib/api";

interface SiteAssetsValue {
  /** Slot id -> public image URL. Empty when nothing has been overridden. */
  images: Record<string, string>;
  loading: boolean;
  /** Returns the admin override for a slot, or the bundled fallback artwork. */
  getImage: (slot: string, fallback: string) => string;
  refresh: () => Promise<void>;
}

const SiteAssetsContext = createContext<SiteAssetsValue | null>(null);

export function SiteAssetsProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setImages(await fetchSiteAssets());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getImage = useCallback(
    (slot: string, fallback: string) => images[slot] || fallback,
    [images],
  );

  const value = useMemo<SiteAssetsValue>(
    () => ({ images, loading, getImage, refresh }),
    [images, loading, getImage, refresh],
  );

  return <SiteAssetsContext.Provider value={value}>{children}</SiteAssetsContext.Provider>;
}

export function useSiteAssets(): SiteAssetsValue {
  const context = useContext(SiteAssetsContext);
  if (!context) throw new Error("useSiteAssets must be used inside <SiteAssetsProvider>.");
  return context;
}
