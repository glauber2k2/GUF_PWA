"use client";

import { useEffect, useSyncExternalStore } from "react";

/*
 * Alertas das abas do menu inferior (bolinha no ícone).
 * Cada feature publica os seus por uma fonte com id próprio (ex.: "follow-requests") e o menu só lê.
 * Assim o AppShell não conhece quem gera o alerta (as features que geram importam o AppShell:
 * importar de volta criaria ciclo) e uma fonte nova entra sem mexer no menu.
 */

/** Abas que podem mostrar alerta (acrescentar aqui quando outra aba precisar). */
export type NavAlertTab = "profile";

export interface NavAlert {
  /** Texto para leitor de tela (ex.: "2 solicitações para seguir"). */
  label: string;
}

/** Alertas ativos por aba; aba sem alerta não aparece. */
export type NavAlertsByTab = ReadonlyMap<NavAlertTab, readonly NavAlert[]>;

const EMPTY: NavAlertsByTab = new Map();
const sources = new Map<NavAlertTab, Map<string, NavAlert>>();
/** Guardado até mudar: useSyncExternalStore exige o mesmo objeto entre leituras. */
let snapshot: NavAlertsByTab = EMPTY;
const listeners = new Set<() => void>();

function buildSnapshot(): NavAlertsByTab {
  const next = new Map<NavAlertTab, readonly NavAlert[]>();
  for (const [tab, alerts] of sources) {
    if (alerts.size > 0) next.set(tab, [...alerts.values()]);
  }
  return next.size > 0 ? next : EMPTY;
}

/** Liga (alert) ou desliga (null) o alerta de uma fonte numa aba. */
export function setNavAlert(tab: NavAlertTab, sourceId: string, alert: NavAlert | null): void {
  const alerts = sources.get(tab) ?? new Map<string, NavAlert>();
  if (alerts.get(sourceId)?.label === alert?.label) return;
  if (alert) alerts.set(sourceId, alert);
  else alerts.delete(sourceId);
  sources.set(tab, alerts);
  snapshot = buildSnapshot();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Alertas ativos de todas as abas. */
export function useNavAlerts(): NavAlertsByTab {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
}

/** Publica o alerta de uma fonte enquanto o componente estiver montado (null = sem alerta). */
export function usePublishNavAlert(tab: NavAlertTab, sourceId: string, alert: NavAlert | null): void {
  const label = alert?.label ?? null;
  useEffect(() => {
    setNavAlert(tab, sourceId, label === null ? null : { label });
    return () => setNavAlert(tab, sourceId, null);
  }, [tab, sourceId, label]);
}
