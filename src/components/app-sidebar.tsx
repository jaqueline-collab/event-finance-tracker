import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
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

const defaultGestaoItems: { title: string; url: string; icon: any; moduleKey: ModuleKey }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, moduleKey: "dashboard" },
  { title: "Clientes", url: "/clientes", icon: Users, moduleKey: "clientes" },
  { title: "Fechamento Mensal", url: "/resumo", icon: CalendarRange, moduleKey: "resumo" },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, moduleKey: "financeiro" },
  { title: "Funil", url: "/orcamentos", icon: Kanban, moduleKey: "orcamentos" },
];

const configItemsAll: { title: string; url: string; icon: any; moduleKey: ModuleKey; adminOnly?: boolean }[] = [
  { title: "Planos", url: "/planos", icon: Package, moduleKey: "planos" },
  { title: "Parceiros", url: "/gestao-parceiros", icon: Handshake, moduleKey: "parceiros" },
  { title: "Usuários", url: "/usuarios", icon: UserCog, moduleKey: "usuarios", adminOnly: true },
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
  const isConfigActive = configItems.some((item) => item.url === pathname);
  const [configOpen, setConfigOpen] = useState(isConfigActive);
  const { state, setOpen } = useSidebar();
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

  const handleConfigClick = () => {
    if (isCollapsed) {
      // Se o sidebar está recolhido: abre o sidebar E o submenu juntos
      setOpen(true);
      setConfigOpen(true);
    } else {
      setConfigOpen((v) => !v);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">Elora</span>
            <span className="text-[10px] text-muted-foreground uppercase">Controle financeiro</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {showGestaoSkeleton &&
                [0, 1, 2, 3, 4].map((i) => (
                  <SidebarMenuItem key={`sk-${i}`}>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Skeleton className="h-4 w-4 rounded" />
                      {!isCollapsed && <Skeleton className="h-3.5 flex-1" />}
                    </div>
                  </SidebarMenuItem>
                ))}
              {visibleGestao.map((item) => (
                <SidebarMenuItem
                  key={item.url}
                  draggable={!isCollapsed}
                  onDragStart={() => setDragUrl(item.url)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(item.url)}
                  onDragEnd={() => setDragUrl(null)}
                  className={cn(
                    "group/drag",
                    dragUrl === item.url && "opacity-50",
                  )}
                >
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                      {!isCollapsed && (
                        <GripVertical className="ml-auto h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            {!access.loading && access.error && !isCollapsed && (
              <div className="mx-2 mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-muted-foreground">
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
              <p className="mx-2 mt-2 text-[11px] text-muted-foreground">
                Nenhum módulo liberado para o seu acesso. Peça a um administrador para liberar em Usuários.
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: Configurações expande para CIMA */}
      <SidebarFooter className="mt-auto pb-2">
        <SidebarSeparator className="mb-1" />
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Submenu renderizado ANTES do botão = expande para cima. Oculto se sidebar colapsado. */}
            {configOpen && !isCollapsed && (
              <SidebarMenuSub className="mb-1 border-l border-sidebar-border">
                {configItems.map((item) => (
                  <SidebarMenuSubItem key={item.url}>
                    <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            )}

            <SidebarMenuButton
              onClick={handleConfigClick}
              isActive={isConfigActive}
              tooltip="Configurações"
              className="w-full"
            >
              <Settings />
              <span>Configurações</span>
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 transition-transform duration-200",
                  configOpen && !isCollapsed && "rotate-180"
                )}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}