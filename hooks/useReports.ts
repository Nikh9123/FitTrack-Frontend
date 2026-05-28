/**
 * useReports
 * ----------
 * Fetches and caches the authenticated user's InBody reports.
 * Wraps listInbodyReports with loading/error/refresh state.
 * Also exposes deleteReport() with optimistic update + rollback.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { listInbodyReports, deleteInbodyReport, type InBodyReport } from "./useInbodyService";

const CACHE_TTL_MS = 30_000; // 30 seconds

export function useReports(token: string | null) {
  const [reports, setReports] = useState<InBodyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchAt = useRef<number>(0);

  const fetchReports = useCallback(
    async (force = false) => {
      if (!token) return;
      const now = Date.now();
      if (!force && now - lastFetchAt.current < CACHE_TTL_MS) return;

      setLoading(true);
      setError(null);
      try {
        const data = await listInbodyReports(token);
        // Show newest first
        setReports([...data].reverse());
        lastFetchAt.current = Date.now();
      } catch (err: any) {
        setError(err?.message ?? "Failed to load reports");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const refresh = useCallback(() => fetchReports(true), [fetchReports]);

  /**
   * deleteReport
   * ------------
   * Optimistically removes the report from local state immediately so the UI
   * feels instant. If the server call fails, the report is restored to its
   * original position and the error is re-thrown for the caller to handle.
   */
  const deleteReport = useCallback(
    async (id: string) => {
      if (!token) throw new Error("Not authenticated");

      // Snapshot current state for rollback
      const snapshot = reports;

      // Optimistic update — remove immediately
      setReports((prev) => prev.filter((r) => r.id !== id));

      // Bust the cache so next refresh is a real fetch
      lastFetchAt.current = 0;

      try {
        await deleteInbodyReport(id, token);
      } catch (err: any) {
        // Rollback on failure
        setReports(snapshot);
        throw err;
      }
    },
    [token, reports],
  );

  return { reports, loading, error, refresh, deleteReport };
}
