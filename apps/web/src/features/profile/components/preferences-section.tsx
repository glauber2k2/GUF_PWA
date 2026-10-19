"use client";

import { useState } from "react";
import { BellRing, MonitorSmartphone, Minus, Plus, SunMoon, Target, TimerOff, Weight } from "lucide-react";
import type { InstallPlatform, WeightUnit } from "@guf/core";
import { WEEKLY_GOAL_MAX, WEEKLY_GOAL_MIN } from "@guf/schemas";
import type { Profile, ProfileUpdate } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import { IconButton, SegmentedControl, Switch } from "@/shared/components/ds";
import { useCoalescedSave } from "@/shared/hooks/use-coalesced-save";
import { keepScreenOnPreference } from "@/shared/hooks/use-screen-wake-lock";
import { useUpdateProfile } from "@/features/profile/api/use-profile";
import { playRestAlert, useRestAlertPreference, type RestAlertPreference } from "@/shared/sound/rest-alert";
import { useThemePreference, type ThemePreference } from "@/shared/preferences/theme";
import { cn } from "@/shared/helpers/class-names";
import { PushAlertsRow } from "./push-alerts-row";
import { ProfileSection, RowGroup, RowIcon } from "./profile-ui";

const UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
];

const THEME_OPTIONS = [
  { value: "dark", label: "Escuro" },
  { value: "light", label: "Claro" },
  { value: "system", label: "Sistema" },
];

const REST_ALERT_OPTIONS = [
  { value: "sound", label: "Som" },
  { value: "silent", label: "Silencioso" },
];

/**
 * Unidade de peso, meta semanal e finalizar treino automaticamente (salvas no perfil, só com internet); tema, aviso de fim do descanso e tela ligada (salvos no aparelho,
 * funciona sem internet); notificações da competição e de seguidores (inscrição deste aparelho, só com internet). O banco guarda sempre kg: a unidade muda só a exibição.
 */
export function PreferencesSection({ profile, canEdit, platform }: { profile: Profile; canEdit: boolean; platform: InstallPlatform }) {
  const shell = useAppShell();
  const update = useUpdateProfile();
  const [theme, setTheme] = useThemePreference();
  const [restAlert, setRestAlert] = useRestAlertPreference();
  const [keepScreenOn, setKeepScreenOn] = keepScreenOnPreference.use();
  const locked = !canEdit;
  const lockedRow = locked && "pointer-events-none opacity-50";

  const save = (input: ProfileUpdate, done?: string) =>
    update.mutate(input, {
      onSuccess: () => {
        if (done) shell.showToast(done, { tone: "success" });
      },
      onError: (e) => shell.showToast(e.message, { tone: "error" }),
    });

  // Meta: o número muda na hora a cada toque, mas só UMA gravação sai quando o usuário para de tocar
  // (useCoalescedSave). Voltar ao valor salvo (4 → 5 → 4) não gera requisição.
  const [draftGoal, setDraftGoal] = useState<number | null>(null);
  const goal = draftGoal ?? profile.weeklyGoal;
  const scheduleGoal = useCoalescedSave<number>(
    async (weeklyGoal) => {
      try {
        await update.mutateAsync({ weeklyGoal });
        // Só limpa o rascunho se nada mudou durante o envio.
        setDraftGoal((d) => (d === weeklyGoal ? null : d));
      } catch (e) {
        setDraftGoal(null);
        shell.showToast((e as { message?: string }).message ?? "Não foi possível salvar a meta. Tente de novo.", { tone: "error" });
      }
    },
    (weeklyGoal) => weeklyGoal === profile.weeklyGoal,
  );
  const changeGoal = (next: number) => {
    const value = Math.min(WEEKLY_GOAL_MAX, Math.max(WEEKLY_GOAL_MIN, next));
    setDraftGoal(value === profile.weeklyGoal ? null : value);
    scheduleGoal(value);
  };
  return (
    <ProfileSection id="pf-prefs" title="Preferências" className="[animation-delay:100ms]">
      <RowGroup first padded className={cn("flex flex-col gap-2.5", lockedRow)}>
        <div aria-disabled={locked || undefined} className="flex items-center gap-3">
          <RowIcon icon={Weight} />
          <span className="flex-1 text-[15px] leading-5 font-semibold">Unidade de peso</span>
          <SegmentedControl
            size="sm"
            label="Unidade de peso"
            options={UNIT_OPTIONS}
            value={profile.weightUnit}
            onChange={(v) => {
              if (v !== profile.weightUnit) save({ weightUnit: v as WeightUnit }, `Pesos exibidos em ${v}`);
            }}
          />
        </div>
        <span className="pl-12 text-[13px] leading-[18px] text-pretty text-fg-muted">Seus registros continuam salvos; só muda a exibição.</span>
      </RowGroup>

      <RowGroup padded className={cn("flex flex-col gap-2.5", lockedRow)}>
        <div aria-disabled={locked || undefined} className="flex items-center gap-3">
          <RowIcon icon={Target} />
          <span className="flex-1 text-[15px] leading-5 font-semibold">Meta semanal</span>
          <div role="group" aria-label="Meta semanal" className="flex items-center gap-1">
            <IconButton
              icon={Minus}
              label="Diminuir meta"
              disabled={locked || goal <= WEEKLY_GOAL_MIN}
              onClick={() => changeGoal(goal - 1)}
            />
            <span aria-live="polite" className="flex min-w-11 flex-col items-center">
              <span className="font-display text-2xl leading-6 font-bold tabular-nums">{goal}</span>
              <span className="text-[11px] leading-[14px] text-fg-muted">por semana</span>
            </span>
            <IconButton
              icon={Plus}
              label="Aumentar meta"
              disabled={locked || goal >= WEEKLY_GOAL_MAX}
              onClick={() => changeGoal(goal + 1)}
            />
          </div>
        </div>
        <span className="pl-12 text-[13px] leading-[18px] text-pretty text-fg-muted">
          A meta serve para acompanhar; a sequência conta com 1 treino por semana.
        </span>
      </RowGroup>

      <RowGroup padded className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <RowIcon icon={SunMoon} />
          <span className="flex-1 text-[15px] leading-5 font-semibold">Tema</span>
        </div>
        <SegmentedControl label="Tema" options={THEME_OPTIONS} value={theme} onChange={(v) => setTheme(v as ThemePreference)} />
      </RowGroup>

      <RowGroup padded className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <RowIcon icon={BellRing} />
          <span className="flex-1 text-[15px] leading-5 font-semibold">Fim do descanso</span>
        </div>
        <SegmentedControl
          label="Aviso de fim do descanso"
          options={REST_ALERT_OPTIONS}
          value={restAlert}
          onChange={(v) => {
            setRestAlert(v as RestAlertPreference);
            // Prévia do aviso escolhido (o toque também libera o áudio no iPhone).
            playRestAlert(v as RestAlertPreference);
          }}
        />
        <span className="text-[13px] leading-[18px] text-pretty text-fg-muted">
          Avisa quando o descanso termina, com o app aberto.
        </span>
      </RowGroup>

      <RowGroup padded className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <RowIcon icon={MonitorSmartphone} />
          <Switch
            label="Manter tela ligada no treino"
            checked={keepScreenOn === "on"}
            onChange={(on) => setKeepScreenOn(on ? "on" : "off")}
            className="flex-1 leading-5 font-semibold"
          />
        </div>
        <span className="pl-12 text-[13px] leading-[18px] text-pretty text-fg-muted">
          A tela não apaga sozinha durante o treino, para o aviso do descanso tocar. Gasta um pouco mais de bateria.
        </span>
      </RowGroup>

      <RowGroup padded className={cn("flex flex-col gap-2.5", lockedRow)}>
        <div aria-disabled={locked || undefined} className="flex items-center gap-3">
          <RowIcon icon={TimerOff} />
          <Switch
            label="Finalizar treino automaticamente"
            checked={profile.autoFinishWorkout}
            disabled={locked}
            onChange={(on) =>
              save(
                { autoFinishWorkout: on },
                on ? "Finalização automática ligada" : "Finalização automática desligada",
              )
            }
            className="flex-1 leading-5 font-semibold"
          />
        </div>
        <span className="pl-12 text-[13px] leading-[18px] text-pretty text-fg-muted">
          Com todas as séries concluídas, o treino é finalizado sozinho após 30 minutos sem atividade, com o horário da última série. Funciona
          mesmo com o app fechado.
        </span>
      </RowGroup>

      <PushAlertsRow platform={platform} canEdit={canEdit} />
    </ProfileSection>
  );
}
