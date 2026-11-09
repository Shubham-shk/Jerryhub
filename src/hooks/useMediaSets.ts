import { useCallback, useEffect, useState } from "react";
import { fetchMediaSets } from "../lib/api";
import type { MediaSet } from "../lib/types";

export function useMediaSets() {
  const [sets, setSets] = useState<MediaSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMediaSets();
      setSets(data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load the library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { sets, loading, error, reload: load };
}
