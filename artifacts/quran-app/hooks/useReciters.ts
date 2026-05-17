import { useCallback, useEffect, useState } from "react";

import { fetchReciters, type QuranReciter } from "@/services/quranApi";

let cachedReciters: QuranReciter[] | null = null;

export function useReciters() {
  const [reciters, setReciters] = useState<QuranReciter[]>(cachedReciters ?? []);
  const [isLoading, setIsLoading] = useState(!cachedReciters);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await fetchReciters();
      cachedReciters = next;
      setReciters(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load reciters.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedReciters) {
      load();
    }
  }, [load]);

  return { reciters, isLoading, error, reload: load };
}
