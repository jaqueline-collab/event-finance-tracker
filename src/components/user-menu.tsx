import { useNavigate } from "@tanstack/react-router";
import { LogOut, User, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client-configured";
import { useDestinoPainel } from "@/lib/use-papel";

export function UserMenu({
  nome,
  email,
  avatarUrl,
  iniciais,
  className,
}: {
  nome: string | null;
  email: string | null;
  avatarUrl: string | null;
  iniciais: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const destino = useDestinoPainel(true);

  const sair = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.replace("/auth");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring ${className ?? ""}`}
        aria-label="Abrir menu do usuário"
      >
        <Avatar className="h-9 w-9 border border-border/60">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={nome ?? email ?? "Perfil"} /> : null}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {iniciais}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              {nome || "Minha conta"}
            </span>
            {email && (
              <span className="text-xs text-muted-foreground truncate">{email}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: destino })}>
          <LayoutDashboard className="h-4 w-4" /> Meu painel
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/perfil" })}>
          <User className="h-4 w-4" /> Editar perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void sair()}>
          <LogOut className="h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
