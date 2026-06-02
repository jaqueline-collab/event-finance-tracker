import { useState } from "react";
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

const gestaoItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Resumo Mensal", url: "/resumo", icon: CalendarRange },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Funil", url: "/orcamentos", icon: Kanban },
];

const configItems = [
  { title: "Planos", url: "/planos", icon: Package },
  { title: "Parceiros", url: "/parceiros", icon: Handshake },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isConfigActive = configItems.some((item) => item.url === pathname);
  const [configOpen, setConfigOpen] = useState(isConfigActive);
  const { state, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";

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
              {gestaoItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
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