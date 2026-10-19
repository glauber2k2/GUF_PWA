"use client";

import { useCallback, useEffect, useState } from "react";
import { pushApi, type PushApi } from "@guf/api";
import type { InstallPlatform } from "@guf/core";
import { useProfileSource } from "@/features/profile/api/use-profile";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { devicePush, type DevicePush } from "@/shared/push/web-push";
import { mockDevicePush, mockPushApi, setPushMockFailing } from "@/mocks/push";

/**
 * Estado dos avisos NESTE aparelho: checking (lendo a inscrição) · unsupported (navegador sem
 * Web Push) · needs-install (iPhone fora da Tela de Início) · blocked (permissão negada) · off · on.
 */
export type PushAlertsStatus = "checking" | "unsupported" | "needs-install" | "blocked" | "off" | "on";

/** Resultado de ligar ou desligar, para a tela escolher o aviso. */
export type PushAlertsOutcome = "enabled" | "disabled" | "blocked" | "dismissed" | { error: string };

const IOS_NOT_INSTALLED: InstallPlatform[] = ["ios-safari", "ios-other-browser"];

function usePushSource(): { api: PushApi; device: DevicePush } {
  const { mock, dev } = useProfileSource();
  if (process.env.NODE_ENV === "development" && mock) {
    setPushMockFailing(dev.scenario === "erro");
    return { api: mockPushApi, device: mockDevicePush };
  }
  return { api: pushApi, device: devicePush };
}

async function readStatus(device: DevicePush, platform: InstallPlatform): Promise<PushAlertsStatus> {
  if (!device.isSupported()) return IOS_NOT_INSTALLED.includes(platform) ? "needs-install" : "unsupported";
  if (device.getPermission() === "denied") return "blocked";
  return (await device.getCurrent().catch(() => null)) ? "on" : "off";
}

/**
 * "Notificações" (competição e seguidores): inscreve ou tira este aparelho do Web Push. Ligar pede a permissão do
 * sistema (precisa vir do toque) e grava a inscrição; se a gravação falhar, desfaz a inscrição
 * local para o aparelho não ficar inscrito sem o servidor saber.
 */
export function usePushAlerts(platform: InstallPlatform) {
  const { api, device } = usePushSource();
  const [status, setStatus] = useState<PushAlertsStatus>("checking");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void readStatus(device, platform).then((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
    };
  }, [device, platform]);

  const enable = useCallback(async (): Promise<PushAlertsOutcome> => {
    const keys = await device.subscribe().catch(() => null);
    if (!keys) {
      const blocked = device.getPermission() === "denied";
      setStatus(blocked ? "blocked" : "off");
      return blocked ? "blocked" : "dismissed";
    }
    const { error } = await api.savePushSubscription(getSupabaseClient(), keys);
    if (error) {
      await device.unsubscribe();
      return { error: error.message };
    }
    setStatus("on");
    return "enabled";
  }, [api, device]);

  const disable = useCallback(async (): Promise<PushAlertsOutcome> => {
    const keys = await device.getCurrent().catch(() => null);
    if (keys) {
      const { error } = await api.deletePushSubscription(getSupabaseClient(), { endpoint: keys.endpoint });
      if (error) return { error: error.message };
    }
    await device.unsubscribe();
    setStatus("off");
    return "disabled";
  }, [api, device]);

  const toggle = useCallback(
    async (on: boolean): Promise<PushAlertsOutcome> => {
      setIsBusy(true);
      try {
        return await (on ? enable() : disable());
      } finally {
        setIsBusy(false);
      }
    },
    [enable, disable],
  );

  return { status, isBusy, toggle };
}
