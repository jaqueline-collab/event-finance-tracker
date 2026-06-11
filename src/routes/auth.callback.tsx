import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { traduzirErroAuth } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Entrando... · Elora" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [mensagem, setMensagem] = useState("Confirmando seu acesso...");

  useEffect(() => {
    let cancelled = false;

    async function processar() {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash || "";
        const code = url.searchParams.get("code");
        const errorDesc =
          url.searchParams.get("error_description") ||
          new URLSearchParams(hash.replace(/^#/, "")).get("error_description");

        if (errorDesc) throw new Error(errorDesc);

        // Fluxo PKCE (?code=...)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href,
          );
          if (error) throw error;
        } else if (hash.includes("access_token")) {
          // Fluxo implícito (#access_token=...): supabase-js processa sozinho.
          // Damos um pequeno tempo pra detectSessionInUrl rodar.
          await new Promise((r) => setTimeout(r, 150));
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          throw new Error("Não foi possível concluir o login. Tente novamente.");
        }

        if (cancelled) return;
        // Limpa a URL pra não vazar tokens no histórico
        window.history.replaceState({}, "", "/dashboard");
        toast.success("Bem-vindo!");
        navigate({ to: "/dashboard", replace: true });
      } catch (err) {
        if (cancelled) return;
        toast.error(traduzirErroAuth(err));
        setMensagem("Link inválido ou expirado.");
        setTimeout(() => navigate({ to: "/auth", replace: true }), 1500);
      }
    }

    processar();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      {mensagem}
    </div>
  );
}