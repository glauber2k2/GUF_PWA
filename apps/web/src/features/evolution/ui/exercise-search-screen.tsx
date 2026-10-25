"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { filterTrainedExercises, formatDayMonth, fromLocalISODate, MUSCLE_GROUP_ORDER, muscleGroupLabel, plural } from "@guf/core";
import { Banner, Chip, EmptyState, Icon, SearchField, Skeleton, Tag } from "@/shared/components/ds";
import { useEvolutionSource, useTrainedExercises } from "@/features/evolution/api/use-evolution";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { DetailHeader } from "@/shared/components/detail-header";
import { exercisePath } from "@/features/evolution/helpers/paths";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { DetailScreen } from "@/shared/components/detail-screen";

/** "Ver evolução de um exercício": só exercícios já feitos, com busca e filtro por grupo muscular. */
export function ExerciseSearchScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const { dev } = useEvolutionSource();
  const trained = useTrainedExercises();
  const online = useOnlineStatus();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);

  const items = useMemo(() => trained.data?.value ?? [], [trained.data]);
  const groups = useMemo(() => MUSCLE_GROUP_ORDER.filter((g) => items.some((e) => e.muscleGroup === g)), [items]);
  const results = useMemo(() => filterTrainedExercises(items, query, group), [items, query, group]);
  const loading = dev.forceLoading || trained.isPending;
  const offline = dev.forceOffline || !online || trained.data?.source === "device";

  return (
    <DetailScreen>
      <DetailHeader title="Evolução por exercício" onBack={goBack} />
      <div className="flex flex-col gap-4 pt-2">
        <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar exercício" aria-label="Buscar exercício" />
        {offline && (
          <Banner tone="warning" title="Sem conexão" className="animate-guf-rise-fast">
            mostrando os últimos dados salvos
          </Banner>
        )}
        {loading ? (
          <div aria-busy="true" aria-label="Carregando exercícios" className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((k) => (
              <Skeleton key={k} className="h-[72px] rounded-lg" />
            ))}
          </div>
        ) : trained.isError ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void trained.refetch()}>
            Não foi possível carregar seus exercícios. Verifique a internet e tente de novo.
          </Banner>
        ) : items.length === 0 ? (
          <EmptyState icon={Search} title="Nenhum exercício feito ainda" message="A evolução aparece depois do primeiro treino concluído." />
        ) : (
          <>
            <div role="group" aria-label="Filtrar por grupo muscular" className="-mx-4 overflow-x-auto [scrollbar-width:none]">
              <div className="flex w-max gap-2 px-4">
                <Chip label="Todos" selected={group === null} onChange={() => setGroup(null)} />
                {groups.map((g) => (
                  <Chip key={g} label={muscleGroupLabel(g)} selected={group === g} onChange={() => setGroup(group === g ? null : g)} />
                ))}
              </div>
            </div>
            <span className="mx-1 -mt-1 text-[13px] leading-[18px] text-fg-muted">
              {plural(results.length, "exercício que você já fez", "exercícios que você já fez")}
            </span>
            {results.length === 0 ? (
              <EmptyState icon={Search} title="Nenhum exercício encontrado" message="Confira a grafia ou escolha outro grupo muscular." />
            ) : (
              <div className="flex flex-col gap-2">
                {results.map((e, i) => {
                  const groupLabel = muscleGroupLabel(e.muscleGroup);
                  const last = formatDayMonth(fromLocalISODate(e.lastPerformedOn));
                  return (
                    <button
                      key={e.exerciseId}
                      type="button"
                      onClick={() => router.push(exercisePath(e.exerciseId))}
                      aria-label={`${e.name}, ${groupLabel}, último treino ${last}. Ver evolução`}
                      // Entrada escalonada (atraso dinâmico).
                      style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                      className="flex min-h-[72px] animate-guf-rise-fast cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface py-3 pr-3 pl-4 text-left text-fg transition-[transform,background-color] duration-150 ease-standard hover:bg-surface-3 active:scale-[.98] motion-reduce:active:scale-100"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="text-base leading-[21px] font-semibold">{e.name}</span>
                        <span className="flex flex-wrap items-center gap-2">
                          {groupLabel && <Tag size="sm">{groupLabel}</Tag>}
                          <span className="text-[13px] text-fg-muted tabular-nums">último treino · {last}</span>
                        </span>
                      </span>
                      <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DetailScreen>
  );
}
