"use client";

import { useState } from "react";
import { Minus, Plus, SunMoon, Target, Weight } from "lucide-react";
import type { WeightUnit } from "@guf/core";
import { WEEKLY_GOAL_MAX, WEEKLY_GOAL_MIN } from "@guf/schemas";
import type { Profile, ProfileUpdate } from "@guf/api";
import { useAppShell } from "@/components/app-shell/app-shell";
import { IconButton, SegmentedControl } from "@/components/ds";
import { useCoalescedSave } from "@/hooks/use-coalesced-save";
import { useUpdateProfile } from "@/hooks/use-profile";
import { useThemePreference, type ThemePreference } from "@/lib/theme/theme";
import { cn } from "@/lib/utils";
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

/**
 * Unidade de peso e meta semanal (salvas no perfil, só com internet) e tema (salvo no aparelho,
 * funciona sem internet). O banco guarda sempre kg: a unidade muda só a exibição.
 */
export function PreferencesSection({ profile, canEdit }: { profile: Profile; canEdit: boolean }) {
  const shell = useAppShell();
  const update = useUpdateProfile();
  const [theme, setTheme] = useThemePreference();
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
    </ProfileSection>
  );
}
