import { useEffect, useState } from "react";
import type { FilterState } from "@/components/filter-bar";

const PREFIX = "elora.filters.";

function normalizeFilterState(input: unknown, defaults: FilterState = {}): FilterState {
  if (!input || typeof input !== "object" || Array.isArray(input)) return defaults;

  const normalized: FilterState = {};
  for (const [key, rawValue] of Object.entries(input)) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) continue;
    const value = rawValue as Record<string, unknown>;

    if (value.type === "multi") {
      normalized[key] = {
        type: "multi",
        values: Array.isArray(value.values) ? value.values.filter((v): v is string => typeof v === "string") : [],
      };
      continue;
    }

    if (value.type === "single") {
      normalized[key] = {
        type: "single",
        value: typeof value.value === "string" ? value.value : "",
      };
      continue;
    }

    if (value.type === "dateRange") {
      normalized[key] = {
        type: "dateRange",
        from: typeof value.from === "string" ? value.from : undefined,
        to: typeof value.to === "string" ? value.to : undefined,
        preset: typeof value.preset === "string" ? value.preset : undefined,
      };
    }
  }

  return normalized;
}

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
      return normalizeFilterState(parsed, defaults);
    } catch {
      return defaults;
    }
  });

  const setNormalizedState = (next: FilterState) => {
    setState(normalizeFilterState(next));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (Object.keys(state).length === 0) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore quota / private mode errors
    }
  }, [key, state]);

  return [state, setNormalizedState];
}