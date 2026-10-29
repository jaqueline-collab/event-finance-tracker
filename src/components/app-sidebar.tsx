import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import {
  LayoutDashboard,
  Package,
  Users,
  CalendarRange,
  FileText,
  Settings,
  Handshake,
  ChevronDown,
  Kanban,
  Wallet,
  GripVertical,
  UserCog,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Globe,
  Plug,
  GraduationCap,
  Eye,
  ChevronsLeft,
} from "lucide-react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useCurrentUserAccess, type ModuleKey } from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { EloraMark } from "@/components/landing/EloraMark";

const defaultGestaoItems: { title: string; url: string; icon: any; moduleKey: ModuleKey }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, moduleKey: "dashboard" },
  { title: "Clientes", url: "/clientes", icon: Users, moduleKey: "clientes" },
  { title: "Configurar API", url: "/configurar-api", icon: Plug, moduleKey: "clientes" },
  { title: "Fechamento Mensal", url: "/resumo", icon: CalendarRange, moduleKey: "resumo" },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, moduleKey: "financeiro" },
  { title: "Funil", url: "/orcamentos", icon: Kanban, moduleKey: "orcamentos" },
];

const configItemsAll: { title: string; url: string; icon: any; moduleKey: ModuleKey; adminOnly?: boolean }[] = [
  { title: "Planos", url: "/planos", icon: Package, moduleKey: "planos" },
  { title: "Parceiros", url: "/gestao-parceiros", icon: Handshake, moduleKey: "parceiros" },
  { title: "Usuários", url: "/usuarios", icon: UserCog, moduleKey: "usuarios", adminOnly: true },
  { title: "Novidades", url: "/novidades", icon: Sparkles, moduleKey: "novidades", adminOnly: true },
  { title: "Treinamento", url: "/treinamento", icon: GraduationCap, moduleKey: "treinamento", adminOnly: true },
];

const ORDER_KEY = "elora.sidebar.order.v1";

function loadOrder(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function sortItems(saved: string[]) {
  const map = new Map(defaultGestaoItems.map((i) => [i.url, i]));
  const ordered = saved.map((u) => map.get(u)).filter(Boolean) as typeof defaultGestaoItems;
  const rest = defaultGestaoItems.filter((i) => !saved.includes(i.url));
  return [...ordered, ...rest];
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const access = useCurrentUserAccess();
  const configItems = configItemsAll.filter((i) =>
    i.adminOnly ? access.isAdmin : access.isAdmin || access.canView(i.moduleKey),
  );
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [gestaoItems, setGestaoItems] = useState(defaultGestaoItems);
  const [dragUrl, setDragUrl] = useState<string | null>(null);

  useEffect(() => {
    setGestaoItems(sortItems(loadOrder()));
  }, []);

  const visibleGestao = gestaoItems.filter((i) => access.isAdmin || access.canView(i.moduleKey));
  const showGestaoSkeleton = access.loading && visibleGestao.length === 0;

  const persistOrder = (items: typeof defaultGestaoItems) => {
    try {
      window.localStorage.setItem(ORDER_KEY, JSON.stringify(items.map((i) => i.url)));
    } catch {
      /* ignore */
    }
  };

  const handleDrop = (targetUrl: string) => {
    if (!dragUrl || dragUrl === targetUrl) return;
    const src = gestaoItems.findIndex((i) => i.url === dragUrl);
    const dst = gestaoItems.findIndex((i) => i.url === targetUrl);
    if (src < 0 || dst < 0) return;
    const next = [...gestaoItems];
    const [moved] = next.splice(src, 1);
    next.splice(dst, 0, moved);
    setGestaoItems(next);
    persistOrder(next);
    setDragUrl(null);
  };

  const grupos: { label: string; urls: string[] }[] = [
    { label: "Monitorar", urls: ["/dashboard", "/clientes", "/orcamentos", "/configurar-api"] },
    { label: "Financeiro", urls: ["/resumo", "/financeiro"] },
  ];

  const renderItem = (item: (typeof defaultGestaoItems)[number]) => (
    <SidebarMenuItem
      key={item.url}
      draggable={!isCollapsed}
      onDragStart={() => setDragUrl(item.url)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => handleDrop(item.url)}
      onDragEnd={() => setDragUrl(null)}
      className={cn("group/drag", dragUrl === item.url && "opacity-50")}
    >
      <SidebarMenuButton
        asChild
        isActive={pathname === item.url}
        tooltip={item.title}
        className="h-10 rounded-lg px-3 text-[13.5px] font-medium text-sidebar-foreground/75 data-[active=true]:bg-brand-soft data-[active=true]:text-sidebar-foreground data-[active=true]:font-semibold [&>svg]:size-[18px] [&>svg]:stroke-[1.6]"
      >
        <Link to={item.url}>
          <item.icon />
          <span>{item.title}</span>
          {!isCollapsed && (
            <GripVertical className="ml-auto h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const labelCls = "px-3 text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/80";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <EloraMark className="h-8 w-8 flex-shrink-0 text-brand" />
          {!isCollapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="text-[15px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                EloraCRM
              </span>
              <span className="text-[10.5px] text-muted-foreground">Painel administrativo</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-2 px-1">
        {access.isAdmin && !isCollapsed && (
          <div className="px-2 pt-1">
            <VerComoBusca />
          </div>
        )}

        {showGestaoSkeleton && (
          <SidebarGroup>
            <SidebarMenu>
              {[0, 1, 2, 3, 4].map((i) => (
                <SidebarMenuItem key={`sk-${i}`}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    {!isCollapsed && <Skeleton className="h-3.5 flex-1" />}
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {grupos.map((g) => {
          const itens = visibleGestao.filter((i) => g.urls.includes(i.url));
          if (itens.length === 0) return null;
          return (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel className={labelCls}>{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">{itens.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {configItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={labelCls}>Configurar</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {configItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      className="h-10 rounded-lg px-3 text-[13.5px] font-medium text-sidebar-foreground/75 data-[active=true]:bg-brand-soft data-[active=true]:text-sidebar-foreground data-[active=true]:font-semibold [&>svg]:size-[18px] [&>svg]:stroke-[1.6]"
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!access.loading && access.error && !isCollapsed && (
          <div className="mx-3 mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
              <span>{access.error}</span>
            </p>
            <button
              type="button"
              onClick={() => void access.refresh()}
              className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-foreground underline underline-offset-2"
            >
              <RefreshCw className="h-3 w-3" /> Tentar novamente
            </button>
          </div>
        )}
        {!access.loading && !access.error && visibleGestao.length === 0 && !isCollapsed && (
          <p className="mx-3 mt-2 text-[11px] text-muted-foreground">
            Nenhum módulo liberado para o seu acesso. Peça a um administrador para liberar em Usuários.
          </p>
        )}
      </SidebarContent>

      <SidebarFooter className="mt-auto pb-3">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Site" className="h-10 rounded-lg px-3 text-[13.5px] text-sidebar-foreground/70">
              <Link to="/">
                <Globe />
                <span>Ver site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={isCollapsed ? "Expandir menu" : "Resumir menu"}
              className="h-10 rounded-lg px-3 text-[13.5px] text-sidebar-foreground/70"
            >
              <ChevronsLeft className={cn("transition-transform", isCollapsed && "rotate-180")} />
              <span>Resumir menu</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
function VerComoBusca() {
  const navigate = useNavigate();
  const { parceiros, clientes } = useStore();
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const resultados = q
    ? [
        ...parceiros.map((p) => ({ id: p.id, nome: p.nome, tipo: "parceiro" as const })),
        ...clientes.map((c) => ({ id: c.id, nome: c.nome, tipo: "cliente" as const })),
      ]
        .filter((i) => i.nome.toLowerCase().includes(q))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .slice(0, 8)
    : [];
  const abrir = (i: { id: string; tipo: "parceiro" | "cliente" }) => {
    setBusca("");
    navigate({ to: i.tipo === "parceiro" ? "/parceiro" : "/area-do-cliente", search: { como: i.id } as never });
  };
  return (
    <div className="px-2 pt-1">
      <label className="flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-2 py-1.5 text-xs">
        <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Ver como… (parceiro ou cliente)"
          aria-label="Ver como parceiro ou cliente"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </label>
      {q && (
        <ul className="mt-1 max-h-64 overflow-y-auto rounded-md border border-sidebar-border bg-popover text-xs">
          {resultados.map((i) => (
            <li key={`${i.tipo}-${i.id}`}>
              <button
                type="button"
                onClick={() => abrir(i)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-sidebar-accent"
              >
                {i.tipo === "parceiro" ? <Handshake className="h-3.5 w-3.5 shrink-0" /> : <Users className="h-3.5 w-3.5 shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{i.nome}</span>
                <span className="text-[10px] text-muted-foreground">{i.tipo === "parceiro" ? "Parceiro" : "Cliente"}</span>
              </button>
            </li>
          ))}
          {resultados.length === 0 && <li className="px-2 py-1.5 text-muted-foreground">Nada encontrado.</li>}
        </ul>
      )}
    </div>
  );
}
