import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronsLeft, ExternalLink, type LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { EloraLogo, EloraIcone } from "@/components/elora-logo";
import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";
import { EloraChat } from "@/components/elora-chat";

export type ItemMenuArea = {
  key: string;
  label: string;
  icon: LucideIcon;
  ativo?: boolean;
  /** Ação interna (troca de seção). */
  onSelect?: () => void;
  /** Link externo (abre em nova aba). */
  href?: string;
};
export type GrupoMenuArea = { label: string; itens: ItemMenuArea[] };

type Ctx = { definir: (grupos: GrupoMenuArea[]) => void };
const AreaMenuContext = createContext<Ctx | null>(null);

/**
 * A página informa os itens do menu. O layout guarda os últimos recebidos,
 * então o menu nunca desmonta nem pisca durante carregamentos.
 */
export function useDefinirMenuArea(grupos: GrupoMenuArea[]) {
  const ctx = useContext(AreaMenuContext);
  const ref = useRef(grupos);
  ref.current = grupos;
  const chave = grupos
    .map((g) => `${g.label}:${g.itens.map((i) => `${i.key}${i.ativo ? "*" : ""}${i.href ?? ""}`).join(",")}`)
    .join("|");
  useEffect(() => {
    // Handlers sempre leem a versão mais recente pela ref.
    ctx?.definir(
      ref.current.map((g) => ({
        ...g,
        itens: g.itens.map((i) => ({
          ...i,
          onSelect: i.onSelect
            ? () => ref.current.flatMap((x) => x.itens).find((y) => y.key === i.key)?.onSelect?.()
            : undefined,
        })),
      })),
    );
  }, [chave, ctx]);
}

const btnCls =
  "h-10 rounded-lg px-3 text-[13.5px] font-medium text-sidebar-foreground/75 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground hover:data-[active=true]:bg-sidebar-primary hover:data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-semibold [&>svg]:size-[18px] [&>svg]:stroke-[1.6]";
const labelCls = "px-3 text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/80";

function AreaSidebar({ subtitulo, grupos }: { subtitulo: string; grupos: GrupoMenuArea[] }) {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const recolhido = state === "collapsed";
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          {recolhido ? <EloraIcone className="h-8 w-8" /> : null}
          {!recolhido && (
            <div className="flex min-w-0 flex-col gap-1">
              <EloraLogo cor="branco" className="h-6 p-0" />
              <span className="text-[10.5px] text-sidebar-foreground/70">{subtitulo}</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-2 px-1">
        {grupos.map((g) =>
          g.itens.length === 0 ? null : (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel className={labelCls}>{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {g.itens.map((i) => (
                    <SidebarMenuItem key={i.key}>
                      {i.href ? (
                        <SidebarMenuButton asChild tooltip={i.label} className={btnCls}>
                          <a href={i.href} target="_blank" rel="noopener noreferrer">
                            <i.icon />
                            <span className="flex-1">{i.label}</span>
                            <ExternalLink className="!size-3 opacity-50" />
                          </a>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          isActive={Boolean(i.ativo)}
                          tooltip={i.label}
                          className={btnCls}
                          onClick={() => {
                            i.onSelect?.();
                            if (isMobile) setOpenMobile(false);
                          }}
                        >
                          <i.icon />
                          <span>{i.label}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>
      <SidebarFooter className="mt-auto pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={recolhido ? "Expandir menu" : "Resumir menu"}
              className="h-10 rounded-lg px-3 text-[13.5px] text-sidebar-foreground/70"
            >
              <ChevronsLeft className={cn("transition-transform", recolhido && "rotate-180")} />
              <span>Resumir menu</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/** Casca das áreas externas: menu lateral + barra superior sempre montados. */
export function AreaExternaLayout({ titulo, area, children }: { titulo: string; area: "cliente" | "parceiro"; children: ReactNode }) {
  const [grupos, setGrupos] = useState<GrupoMenuArea[]>([]);
  const [ctx] = useState<Ctx>(() => ({ definir: (g) => setGrupos(g) }));
  return (
    <AreaMenuContext.Provider value={ctx}>
      <AreaSidebar subtitulo={titulo} grupos={grupos} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader label={titulo} showTrigger email={null} />
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
      <EloraChat area={area} />
    </AreaMenuContext.Provider>
  );
}
