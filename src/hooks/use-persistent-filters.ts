import { useEffect, useState } from "react";
import type { FilterState } from "@/components/filter-bar";

const PREFIX = "elora.filters.";

export function usePersistentFilters(
  scope: string,
  defaults: FilterState = {},
): [FilterState, (next: FilterState) => void] {
  const key = PREFIX + scope;
  const [state, setState] = useState<FilterState>(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as FilterState) : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (Object.keys(state).length === 0) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore quota / private mode errors
    }
  }, [key, state]);

  return [state, setState];
}