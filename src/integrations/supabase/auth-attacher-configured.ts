import { createMiddleware } from "@tanstack/react-start";
import { getCachedAccessToken } from "@/lib/auth-session";

export const attachConfiguredAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = getCachedAccessToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);