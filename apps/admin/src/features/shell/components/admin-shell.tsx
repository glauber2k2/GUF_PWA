"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { Avatar, cn, Icon, IconButton, ScreenPortal } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { MeCard } from "@/features/shell/components/me-card";
import { NavList } from "@/features/shell/components/nav-list";
import { BACK_PATHS, PAGE_TITLES } from "@/features/shell/constants/nav";
import { useGoToSearch, useSearchShortcut } from "@/features/shell/hooks/use-search-shortcut";
import { AdminWordmark, EnvironmentBadge, RoleBadge, ROLE_ICONS } from "@/shared/components/badges";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { useDevice } from "@/shared/hooks/use-device";
import { STAFF_ROLES } from "@guf/core";

/**
 * Moldura do painel (protótipo 2a–2f): barra lateral no computador, recolhida (só ícones) no tablet
 * com opção de abrir, e gaveta no celular. Ambiente e papel sempre visíveis no topo.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const device = useDevice();
  const [railOpen, setRailOpen] = useState(false);
  useSearchShortcut(device === "desktop");

  const showFullSidebar = device === "desktop" || (device === "tablet" && railOpen);
  return (
    <div className="flex h-dvh overflow-hidden">
      {device !== "mobile" && (showFullSidebar ? <FullSidebar onCollapse={device === "tablet" ? () => setRailOpen(false) : undefined} /> : <Rail onExpand={() => setRailOpen(true)} />)}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {device === "mobile" ? <MobileHeader /> : <TopBar showShortcut={device === "desktop"} />}
        <div className="relative min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function FullSidebar({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <nav aria-label="Navegação principal" className="flex w-62 flex-none flex-col gap-1 border-r border-border bg-surface px-3 py-4">
      <div className="mb-4 flex h-11 items-center justify-between gap-2 pr-1.5 pl-2.5">
        <AdminWordmark />
        {onCollapse && <IconButton icon={PanelLeftClose} label="Recolher menu" variant="ghost" onClick={onCollapse} />}
      </div>
      <NavList />
      <div className="flex-1" />
      <MeCard />
    </nav>
  );
}

function Rail({ onExpand }: { onExpand: () => void }) {
  const { staff } = useStaff();
  return (
    <nav aria-label="Navegação principal" className="flex w-18 flex-none flex-col items-center gap-1 border-r border-border bg-surface py-4">
      <IconButton icon={PanelLeftOpen} label="Abrir menu" variant="ghost" onClick={onExpand} className="mb-4" />
      <NavList compact />
      <div className="flex-1" />
      <Avatar name={staff.displayName} size="sm" tone="accent" />
    </nav>
  );
}

function TopBar({ showShortcut }: { showShortcut: boolean }) {
  const { staff } = useStaff();
  const goToSearch = useGoToSearch();
  return (
    <header className="flex h-16 flex-none items-center gap-3 border-b border-border bg-background/90 px-[clamp(16px,2.2vw,32px)]">
      <button
        type="button"
        onClick={goToSearch}
        className="flex h-11 max-w-[420px] flex-1 cursor-pointer items-center gap-2.5 rounded-md border border-border-strong bg-surface-3 px-3 text-left text-fg-muted hover:text-fg-secondary"
      >
        <Icon icon={Search} size={17} />
        <span className="flex-1">Buscar pessoa</span>
        {showShortcut && <kbd className="grid h-5.5 min-w-5.5 place-items-center rounded-[6px] border border-border-strong font-sans text-[11px]">/</kbd>}
      </button>
      <div className="flex-1" />
      <EnvironmentBadge />
      <RoleBadge role={staff.role} />
    </header>
  );
}

function MobileHeader() {
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  const router = useRouter();
  const goToSearch = useGoToSearch();
  const { staff } = useStaff();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const backPath = BACK_PATHS[pathname];

  return (
    <header className="flex flex-none flex-col border-b border-border bg-background/90">
      <div className="flex h-14 items-center gap-1 pr-2 pl-1">
        {backPath ? (
          <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={() => router.push(withDevState(backPath))} />
        ) : (
          <IconButton icon={Menu} label="Abrir menu" variant="ghost" onClick={() => setDrawerOpen(true)} />
        )}
        <h1 className="m-0 min-w-0 flex-1 truncate text-lg leading-6 font-bold tracking-[-0.01em]">{PAGE_TITLES[pathname] ?? "guf admin"}</h1>
        {pathname !== "/pessoas" && pathname !== "/comunicados/editar" && <IconButton icon={Search} label="Buscar pessoa" variant="ghost" onClick={goToSearch} />}
      </div>
      <div className="flex h-7 items-center gap-2 px-4 text-xs font-semibold">
        <EnvironmentBadge className="h-auto border-0 bg-transparent px-0" />
        <span className="text-fg-muted">·</span>
        <span className="inline-flex items-center gap-1.5 text-fg-secondary">
          <Icon icon={ROLE_ICONS[staff.role]} size={12} />
          {STAFF_ROLES[staff.role].label}
        </span>
      </div>
      {drawerOpen && <Drawer onClose={() => setDrawerOpen(false)} />}
    </header>
  );
}

function Drawer({ onClose }: { onClose: () => void }) {
  return (
    <ScreenPortal>
      <div className="fixed inset-0 z-[60] flex">
        <nav aria-label="Navegação principal" className={cn("flex h-full w-[min(86%,320px)] animate-guf-from-left flex-col gap-1 bg-surface-elevated p-3 shadow-e3")}>
          <div className="mb-2 flex h-12 items-center justify-between pl-2">
            <AdminWordmark />
            <IconButton icon={X} label="Fechar menu" variant="ghost" onClick={onClose} />
          </div>
          <NavList large onNavigate={onClose} />
          <div className="flex-1" />
          <MeCard showRole />
        </nav>
        <button type="button" aria-label="Fechar menu" onClick={onClose} className="flex-1 cursor-pointer bg-scrim" />
      </div>
    </ScreenPortal>
  );
}
