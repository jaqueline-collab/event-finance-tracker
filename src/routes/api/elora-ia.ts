import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/elora-ia")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { tratarChatElora } = await import("@/lib/elora-ia-chat.server");
        return tratarChatElora(request);
      },
    },
  },
});
