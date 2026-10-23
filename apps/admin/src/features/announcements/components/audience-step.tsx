"use client";

import { useState } from "react";
import { Calendar, Crown, HeartPulse, List, Lock, Plus, Users, X, type LucideIcon } from "lucide-react";
import {
  addAudienceRule,
  AUDIENCE_CRITERIA,
  AUDIENCE_RULE_TYPES,
  CREATED_OPS,
  formatCount,
  hasAudienceRule,
  parseTargetIds,
  removeAudienceRule,
  replaceAudienceRule,
  type AccountCreatedOp,
  type Audience,
  type AudienceRule,
  type AudienceRuleType,
} from "@guf/core";
import { Banner, Chip, cn, Icon, SegmentedControl, TextAreaField, TextField } from "@guf/ui";
import { PersonPicker } from "@/features/announcements/components/person-picker";
import { usePlanOptions } from "@/shared/hooks/use-plan-options";

/** Ícone de cada tipo de regra (o catálogo de regras fica em packages/core). */
const RULE_ICONS: Record<AudienceRuleType, LucideIcon> = {
  all: Users,
  ids: List,
  plans: Crown,
  created: Calendar,
  visibility: Lock,
  health_consent: HeartPulse,
};

interface AudienceStepProps {
  audience: Audience;
  idsText: string;
  targetCount: number;
  invalidIdCount: number;
  reach: number | undefined;
  isReachLoading: boolean;
  planNames: Record<string, string>;
  onAudience: (audience: Audience) => void;
  onIdsText: (text: string) => void;
}

/** Valores da regra selecionada (cada tipo tem seu editor; tipo novo = editor novo aqui). */
function RuleEditor({ rule, onChange, idsText, onIdsText, targetCount, invalidIdCount }: {
  rule: AudienceRule;
  onChange: (rule: AudienceRule) => void;
  idsText: string;
  onIdsText: (text: string) => void;
  targetCount: number;
  invalidIdCount: number;
}) {
  const plans = usePlanOptions();
  const label = AUDIENCE_CRITERIA[rule.type].label;
  switch (rule.type) {
    case "all":
      return <Explained title={label}>Todas as contas ativas. Adicione regras para restringir.</Explained>;
    case "health_consent":
      return <Explained title={label}>Só pessoas que autorizaram o uso de dados de saúde. As medidas em si não são usadas nem mostradas.</Explained>;
    case "ids":
      return (
        <>
          <PersonPicker selectedIds={parseTargetIds(idsText).ids} onAdd={(userId) => onIdsText(`${idsText}\n${userId}`.trim())} />
          <TextAreaField
            label="Lista de ids"
            rows={4}
            value={idsText}
            onChange={(e) => onIdsText(e.target.value)}
            placeholder="Ou cole os ids, um por linha"
            className="font-display"
          />
          <label className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-[13px] text-fg-secondary">
            <span>
              {formatCount(targetCount)} ids válidos{invalidIdCount > 0 ? ` · ${invalidIdCount} não são ids e serão ignorados` : ""}
            </span>
            <span className="inline-flex h-11 items-center rounded-md border border-border-strong bg-surface-3 px-4 font-semibold text-fg">
              Enviar arquivo .csv
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                onChange={(e) => void e.target.files?.[0]?.text().then((text) => onIdsText(`${idsText}\n${text}`.trim()))}
              />
            </span>
          </label>
          <span className="text-xs text-fg-muted">Os ids não vão para logs e a lista é apagada quando o comunicado termina.</span>
        </>
      );
    case "plans":
      return (
        <>
          <strong>{label}</strong>
          <div className="flex flex-wrap gap-2">
            {(plans.data ?? []).map((plan) => (
              <Chip
                key={plan.code}
                label={plan.name}
                selected={rule.plans.includes(plan.code)}
                onChange={(on) => {
                  const next = on ? [...rule.plans, plan.code] : rule.plans.filter((p) => p !== plan.code);
                  if (next.length > 0) onChange({ ...rule, plans: next });
                }}
              />
            ))}
          </div>
        </>
      );
    case "created":
      return (
        <>
          <strong>{label}</strong>
          <SegmentedControl
            label="Quando a conta foi criada"
            options={(Object.keys(CREATED_OPS) as AccountCreatedOp[]).map((op) => ({ value: op, label: CREATED_OPS[op] }))}
            value={rule.op}
            onChange={(op) => onChange({ ...rule, op: op as AccountCreatedOp })}
          />
          <TextField label="Data (horário de Brasília)" type="date" value={rule.date} onChange={(e) => e.target.value && onChange({ ...rule, date: e.target.value })} />
        </>
      );
    case "visibility":
      return (
        <>
          <strong>Perfil</strong>
          <SegmentedControl
            label="Perfil"
            options={[
              { value: "open", label: "Aberto" },
              { value: "private", label: "Privado" },
            ]}
            value={rule.value}
            onChange={(value) => onChange({ ...rule, value: value as "open" | "private" })}
          />
        </>
      );
  }
}

function Explained({ title, children }: { title: string; children: string }) {
  return (
    <>
      <strong>{title}</strong>
      <span className="text-fg-secondary">{children}</span>
    </>
  );
}

/** 8c–8d · b) Público: regras que se somam (E), editor da regra escolhida e alcance estimado. */
export function AudienceStep(props: AudienceStepProps) {
  const { audience, targetCount, reach, isReachLoading, planNames, onAudience } = props;
  const [selected, setSelected] = useState<AudienceRuleType>(audience.rules[audience.rules.length - 1]?.type ?? "all");
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedRule = audience.rules.find((r) => r.type === selected) ?? audience.rules[0];
  const context = { planNames, targetCount };

  const add = (type: AudienceRuleType) => {
    if (hasAudienceRule(audience, type)) return;
    onAudience(addAudienceRule(audience, AUDIENCE_CRITERIA[type].create(new Date())));
    setSelected(type);
    setMenuOpen(false);
  };
  const remove = (type: AudienceRuleType) => {
    const next = removeAudienceRule(audience, type);
    onAudience(next);
    setSelected(next.rules[next.rules.length - 1]?.type ?? "all");
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-lg leading-6 font-bold">Quem vê o comunicado</h3>
        <p className="m-0 text-fg-secondary">As regras se somam: a pessoa precisa atender a todas.</p>
      </div>
      <div className="relative flex flex-wrap items-center gap-2">
        {audience.rules.map((rule, index) => (
          <span key={rule.type} className="contents">
            {index > 0 && <span className="text-xs font-bold tracking-[.08em] text-fg-muted">E</span>}
            <span
              className={cn(
                "inline-flex h-11 items-center rounded-pill border-[1.5px]",
                rule.type === selected ? "border-accent-text bg-accent/10" : "border-border-strong",
              )}
            >
              <button
                type="button"
                aria-pressed={rule.type === selected}
                onClick={() => setSelected(rule.type)}
                className="inline-flex h-full cursor-pointer items-center gap-2 pr-1 pl-3.5 font-semibold"
              >
                <Icon icon={RULE_ICONS[rule.type]} size={15} className="text-fg-secondary" />
                {AUDIENCE_CRITERIA[rule.type].describe(rule, context)}
              </button>
              <button
                type="button"
                aria-label={`Remover regra ${AUDIENCE_CRITERIA[rule.type].label}`}
                onClick={() => remove(rule.type)}
                className="grid size-10 cursor-pointer place-items-center rounded-pill text-fg-muted hover:text-fg"
              >
                <Icon icon={X} size={15} />
              </button>
            </span>
          </span>
        ))}
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-pill border-[1.5px] border-dashed border-border-strong px-3.5 font-semibold text-fg-secondary hover:text-fg"
        >
          <Icon icon={Plus} size={16} />
          Adicionar regra
        </button>
        {menuOpen && (
          <ul role="menu" className="absolute top-[calc(100%+6px)] left-0 z-10 m-0 w-[min(100%,320px)] list-none rounded-[14px] border border-border-strong bg-surface-elevated p-1.5 shadow-e3">
            {AUDIENCE_RULE_TYPES.map((type) => {
              const used = hasAudienceRule(audience, type);
              return (
                <li key={type} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    aria-disabled={used}
                    onClick={() => add(type)}
                    className={cn("flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left", used ? "cursor-default opacity-50" : "cursor-pointer hover:bg-surface-3")}
                  >
                    <Icon icon={RULE_ICONS[type]} size={16} className="text-fg-secondary" />
                    <span className="flex-1">{AUDIENCE_CRITERIA[type].label}</span>
                    {used && <span className="text-xs text-fg-muted">Já usada</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hasAudienceRule(audience, "health_consent") && (
        <Banner tone="warning" icon={HeartPulse} title="Só para comunicados legais ou de serviço.">
          Com a regra de consentimento de saúde, a finalidade “Produto” fica indisponível no passo Revisar.
        </Banner>
      )}

      {selectedRule && (
        <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-4">
          <RuleEditor
            rule={selectedRule}
            onChange={(rule) => onAudience(replaceAudienceRule(audience, rule))}
            idsText={props.idsText}
            onIdsText={props.onIdsText}
            targetCount={targetCount}
            invalidIdCount={props.invalidIdCount}
          />
        </div>
      )}

      <div aria-live="polite" className="flex items-center gap-3.5 rounded-lg border border-border bg-surface-elevated px-5 py-4">
        <Icon icon={Users} size={22} className="text-fg-secondary" />
        <div className="flex flex-1 flex-col">
          <span className="text-overline font-semibold tracking-[.08em] text-fg-muted uppercase">Alcance estimado</span>
          <span className={cn("text-[15px]", isReachLoading && "opacity-60")}>
            cerca de <span className="font-display text-[32px] leading-9 font-bold tabular-nums">{reach === undefined ? "…" : formatCount(reach)}</span> pessoas
          </span>
        </div>
      </div>
    </>
  );
}
