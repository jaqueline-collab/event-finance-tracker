import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { usePerfil } from "@/hooks/use-perfil";

/** Bolinha de perfil no topo (foto ou iniciais). */
function HeaderUserMenu({ email }: { email: string | null }) {
  const perfil = usePerfil();
  return (
    <UserMenu
      nome={perfil.nome}
      email={perfil.email ?? email}
      avatarUrl={perfil.avatarUrl}
      iniciais={perfil.iniciais}
    />
  );
}

/** Barra superior compartilhada pelo painel interno e pelas áreas do parceiro/cliente. */
export function AppHeader({
  label,
  showTrigger,
  email,
}: {
  label: string;
  showTrigger: boolean;
  email: string | null;
}) {
  return (
    <header className="h-16 flex items-center gap-1 sm:gap-3 border-b border-border/60 px-3 sm:px-6 sticky top-0 bg-card/90 backdrop-blur z-10">
      {showTrigger && <SidebarTrigger className="md:hidden" />}
      <div className="flex-1 min-w-0">
        <span className="block truncate text-[13px] font-medium text-muted-foreground">{label}</span>
      </div>
      <div id="app-header-actions" className="flex shrink-0 items-center gap-1" aria-label="Atalhos da área atual" />
      <ThemeToggle />
      <NotificationBell />
      <HeaderUserMenu email={email} />
    </header>
  );
}
