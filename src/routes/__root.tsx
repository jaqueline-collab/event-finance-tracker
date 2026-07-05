import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const errorMessage = error?.message || String(error || "Erro desconhecido");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Você pode tentar novamente ou voltar para o início.
        </p>
        {errorMessage && (
          <div className="mt-4 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Erro:</span> {errorMessage}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "EloraCRM — WhatsApp, Instagram e Messenger em um só lugar" },
      { name: "description", content: "CRM com atendimento omnichannel, chatbot, disparo de mensagens e agentes de IA para WhatsApp, Instagram e Messenger." },
      { property: "og:title", content: "EloraCRM — Atendimento, Vendas e Automação" },
      { property: "og:description", content: "Plataforma completa: Central de Atendimento, Chatbot, Disparo de Mensagens, CRM e Agentes Inteligentes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "EloraCRM" },
      { name: "twitter:description", content: "Comunicação eficiente e escalável para impulsionar seu negócio." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const syncFromSupabase = useStore((state) => state.syncFromSupabase);
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) syncFromSupabase();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
      if (data.session) syncFromSupabase();
    });
    return () => subscription.unsubscribe();
  }, [syncFromSupabase]);

  // Mantém a sessão viva: refresh ao voltar o foco e a cada 30 min.
  useEffect(() => {
    const refresh = () => {
      supabase.auth.refreshSession().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 30 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
      window.clearInterval(interval);
    };
  }, []);

  // Rotas públicas: landing e fluxo de auth
  const isPublicRoute = pathname === "/" || pathname.startsWith("/auth");
  // Rota da landing: não renderiza shell do app
  const isLanding = pathname === "/";

  // Landing pública: renderiza imediatamente sem esperar checagem de sessão
  if (isLanding) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster />
      </QueryClientProvider>
    );
  }

  if (checking) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
          Carregando...
        </div>
      </QueryClientProvider>
    );
  }

  if (!session) {
    if (!isPublicRoute && typeof window !== "undefined") {
      window.location.replace("/auth");
      return null;
    }
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background text-foreground">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center gap-3 border-b border-border/60 px-4 sticky top-0 bg-background/80 backdrop-blur z-10">
              <SidebarTrigger />
              <div className="text-sm text-muted-foreground flex-1">Elora · Controle financeiro</div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {session.user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.invalidate();
                  window.location.replace("/auth");
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Sair</span>
              </Button>
            </header>
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
