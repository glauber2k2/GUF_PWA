"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeftRight,
  Cable,
  Check,
  CircleDot,
  Cog,
  Dumbbell,
  GripHorizontal,
  PersonStanding,
  Plus,
  SearchX,
  Spline,
  Weight,
  X,
  type LucideIcon,
} from "lucide-react";
import type { LibraryExercise } from "@guf/api";
import {
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_ORDER,
  equipmentLabel,
  muscleGroupLabel,
  searchFilter,
  plural,
} from "@guf/core";
import {
  Banner,
  BottomSheet,
  Button,
  Chip,
  EmptyState,
  Icon,
  IconButton,
  MuscleFilterTile,
  MuscleIcon,
  muscleIconKey,
  ScreenPortal,
  SearchField,
  SheetOption,
  Skeleton,
  TextField,
} from "@/shared/components/ds";
import { useAppShell, useRaisedToast } from "@/features/app-shell";
import { enqueue } from "@/shared/offline/outbox";
import { addToLibraryCache, loadExerciseLibrary } from "@/shared/offline/workout-repo";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { cn } from "@/shared/helpers/class-names";
import { mockWorkoutApi } from "@/mocks/workout";

export type ExercisePickerMode = "rotina" | "treino" | "troca";

export const EXERCISE_LIBRARY_KEY = "exercise-library";


/** Grupos com cartão no filtro (ordem do protótipo, cardio no fim); corpo inteiro fica de fora. */
const FILTER_GROUPS = ["peito", "ombros", "costas", "abdomen", "biceps", "triceps", "antebraco", "gluteos", "quadriceps", "posterior", "panturrilha", "cardio"];

/** Grupos sem silhueta de músculo mostram um ícone no tile e no cabeçalho da seção. */
const GROUP_ICONS: Partial<Record<string, LucideIcon>> = { cardio: Activity, corpo_inteiro: PersonStanding };

/** Ícone do equipamento no selo do exercício. */
const EQUIPMENT_ICONS: Record<string, LucideIcon> = {
  barra: Dumbbell,
  halter: Dumbbell,
  maquina: Cog,
  polia: Cable,
  peso_corporal: PersonStanding,
  kettlebell: Weight,
  smith: GripHorizontal,
  elastico: Spline,
  outro: CircleDot,
};

/** Dica de rolagem do filtro de músculos: mostra uma vez por aparelho, até o usuário rolar. */
const FILTER_HINT_KEY = "guf-muscle-filter-scrolled";

function useScrollHint() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const animRef = useRef<Animation | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(FILTER_HINT_KEY) === "1";
    } catch {
      // Sem armazenamento: mostra a dica.
    }
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => {
      const track = trackRef.current;
      if (!track?.animate || doneRef.current) return;
      animRef.current = track.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-44px)", offset: 0.35 }, { transform: "translateX(0)", offset: 0.7 }, { transform: "translateX(0)" }],
        { duration: 1300, easing: "cubic-bezier(.2,0,0,1)", iterations: 2 },
      );
    }, 700);
    return () => {
      clearTimeout(timer);
      animRef.current?.cancel();
    };
  }, []);

  const onScroll = () => {
    if (doneRef.current || (scrollRef.current?.scrollLeft ?? 0) < 8) return;
    doneRef.current = true;
    animRef.current?.cancel();
    try {
      localStorage.setItem(FILTER_HINT_KEY, "1");
    } catch {
      // Sem armazenamento: a dica pode voltar na próxima vez.
    }
  };

  return { scrollRef, trackRef, onScroll };
}
const SKELETON_WIDTHS = ["w-40", "w-32", "w-44", "w-28", "w-36", "w-[140px]"];

export interface ExercisePickerProps {
  mode: ExercisePickerMode;
  /** Exercícios que já estão na rotina/treino (aparecem como "Já adicionado"). */
  addedExerciseIds: readonly string[];
  offline?: boolean;
  /** false = modo de demonstração (mock, sem gravar). */
  persist?: boolean;
  onClose: () => void;
  /** Exercícios escolhidos, na ordem em que foram marcados. */
  onConfirm: (exercises: LibraryExercise[]) => void;
}

/**
 * Escolher exercícios: busca sem acento, filtro por grupo muscular, seções com a silhueta
 * do corpo. Tocar marca 1 (ou vários) e o botão adiciona todos de uma vez. Em "troca",
 * a escolha é única.
 */
/** Ícone do grupo no cabeçalho da seção (corpo inteiro e cardio não têm silhueta de músculo). */
function SectionIcon({ group }: { group: string }) {
  const key = muscleIconKey(group);
  return (
    <span className="grid size-11 flex-none place-items-center overflow-hidden rounded-md border border-border bg-surface text-fg-secondary">
      {key ? <MuscleIcon muscle={key} zoom size={42} animate="none" label="" /> : <Icon icon={GROUP_ICONS[group] ?? PersonStanding} size={22} />}
    </span>
  );
}

export function ExercisePicker({
  mode,
  addedExerciseIds,
  offline = false,
  persist = true,
  onClose,
  onConfirm,
}: ExercisePickerProps) {
  const queryClient = useQueryClient();
  const library = useQuery({
    queryKey: [EXERCISE_LIBRARY_KEY, persist],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      // Banco (com cópia no aparelho para usar sem internet) ou, na demonstração, o mock.
      const { data, error } = persist
        ? await loadExerciseLibrary()
        : await mockWorkoutApi.getExerciseLibrary(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });

  const single = mode === "troca";
  const [query, setQuery] = useState("");
  /** Grupos marcados no filtro (vários); vazio = todos. */
  const [groups, setGroups] = useState<string[]>([]);
  const { scrollRef: filterScrollRef, trackRef: filterTrackRef, onScroll: onFilterScroll } = useScrollHint();
  const [selected, setSelected] = useState<string[]>([]);
  const [lastPicked, setLastPicked] = useState<string | null>(null);
  const shell = useAppShell();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<string>("peito");
  const [newEquipment, setNewEquipment] = useState<string>("maquina");
  const [nameError, setNameError] = useState<string | null>(null);
  // Barra "Adicionar N" fixa no rodapé: a pilha de avisos sobe para não cobri-la.
  useRaisedToast(selected.length > 0 && !single);

  // Esc fecha o seletor (quando a folha de criar não está aberta).
  useEffect(() => {
    if (createOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createOpen, onClose]);

  const added = useMemo(() => new Set(addedExerciseIds), [addedExerciseIds]);
  const exercises = useMemo(() => library.data ?? [], [library.data]);

  const sections = useMemo(() => {
    // Busca flexível: "elev lat" acha "Elevação lateral"; também busca pelo equipamento ("halter").
    return MUSCLE_GROUP_ORDER.filter((g) => groups.length === 0 || groups.includes(g))
      .map((group) => ({
        group,
        items: searchFilter(
          exercises.filter((e) => e.muscleGroup === group),
          query,
          (e) => [e.name, equipmentLabel(e.equipment)],
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [exercises, groups, query]);

  const create = useMutation({
    mutationFn: async (): Promise<LibraryExercise> => {
      // Criado no aparelho (id local) e enviado pela fila: funciona sem internet.
      const exercise: LibraryExercise = {
        id: crypto.randomUUID(),
        name: newName.trim(),
        muscleGroup: newGroup,
        equipment: newEquipment,
        isCustom: true,
      };
      if (!persist) {
        const { data, error } = await mockWorkoutApi.createExercise(getSupabaseClient(), exercise);
        if (error) throw error;
        return data;
      }
      await addToLibraryCache(exercise);
      await enqueue({ kind: "createExercise", ...exercise });
      return exercise;
    },
    onSuccess: (exercise) => {
      queryClient.setQueryData<LibraryExercise[]>([EXERCISE_LIBRARY_KEY, persist], (prev) => [...(prev ?? []), exercise]);
      setSelected((prev) => (single ? [exercise.id] : [...prev, exercise.id]));
      setLastPicked(exercise.id);
      setCreateOpen(false);
      setQuery("");
      setGroups(FILTER_GROUPS.includes(exercise.muscleGroup) ? [exercise.muscleGroup] : []);
      shell.showToast(`${exercise.name} criado`, { tone: "success" });
    },
    onError: (error) => setNameError(error.message),
  });

  const toggle = (id: string) => {
    const isOn = selected.includes(id);
    setSelected(single ? (isOn ? [] : [id]) : isOn ? selected.filter((s) => s !== id) : [...selected, id]);
    setLastPicked(isOn ? null : id);
  };

  const openCreate = () => {
    setNewName(query.trim() || newName);
    setNameError(null);
    setCreateOpen(true);
  };

  const confirm = () => {
    const chosen = selected
      .map((id) => exercises.find((e) => e.id === id))
      .filter((e): e is LibraryExercise => Boolean(e));
    if (chosen.length > 0) onConfirm(chosen);
  };

  const count = selected.length;
  const ready = library.isSuccess;
  const title = single ? "Trocar exercício" : "Adicionar exercícios";
  const helper = single
    ? "Escolha o exercício que vai entrar no lugar."
    : "Toque para marcar. Marque vários para adicionar de uma vez.";
  const ctaLabel = single ? "Trocar exercício" : count > 1 ? `Adicionar ${count} exercícios` : "Adicionar exercício";

  // Portal: tela cheia fixa, fora de ancestrais animados (ver ScreenPortal).
  return (
    <ScreenPortal>
      <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 animate-guf-in-right bg-background">
        <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col pt-[env(safe-area-inset-top)]">
          <header className="flex h-[52px] flex-none items-center gap-1 px-2">
            <IconButton icon={X} label="Fechar" variant="ghost" onClick={onClose} />
            <h1 className="m-0 flex-1 text-center text-[17px] leading-[22px] font-semibold">{title}</h1>
            <span className="w-11 flex-none" />
          </header>

          <div className="flex flex-none flex-col gap-3 px-4 pt-1">
            <SearchField placeholder="Buscar exercício" value={query} onChange={(e) => setQuery(e.target.value)} />
            {offline && (
              <Banner tone="warning" title="Sem conexão">
                mostrando os exercícios salvos no aparelho
              </Banner>
            )}
          </div>

          <div role="group" aria-label="Filtrar por grupo muscular" className="flex flex-none flex-col gap-2 pt-3">
            <div className="flex min-h-6 items-center justify-between px-5">
              <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Grupos musculares</span>
              <span className="flex items-center gap-3">
                <span className="text-[13px] text-fg-secondary">
                  {groups.length === 0 ? "Todos" : groups.length === 1 ? "1 selecionado" : `${groups.length} selecionados`}
                </span>
                {groups.length > 0 && (
                  <button type="button" onClick={() => setGroups([])} className="cursor-pointer bg-transparent py-1 text-[13px] font-semibold text-accent-text">
                    Limpar
                  </button>
                )}
              </span>
            </div>
            <div
              ref={filterScrollRef}
              onScroll={onFilterScroll}
              className="snap-x snap-proximity scroll-px-4 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
            >
              <div ref={filterTrackRef} className="flex w-max gap-2 px-4">
                {FILTER_GROUPS.map((g) => {
                  const key = muscleIconKey(g);
                  const icon = GROUP_ICONS[g];
                  const figure = key ? { muscle: key } : icon ? { icon } : null;
                  if (!figure) return null;
                  const on = groups.includes(g);
                  return (
                    <MuscleFilterTile
                      key={g}
                      {...figure}
                      size="sm"
                      selected={on}
                      onToggle={() => setGroups(on ? groups.filter((x) => x !== g) : [...groups, g])}
                      className="w-[83px] flex-none snap-start"
                    >
                      {g === "ombros" ? "Ombro" : g === "posterior" ? "Posterior" : muscleGroupLabel(g)}
                    </MuscleFilterTile>
                  );
                })}
              </div>
            </div>
          </div>
          <span className="flex-none px-4 pt-2.5 pb-1 text-[13px] leading-[18px] text-pretty text-fg-muted">{helper}</span>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[168px] [scrollbar-width:none]">
            {library.isPending && (
              <div aria-busy="true" aria-label="Carregando exercícios" className="flex flex-col gap-3.5 pt-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-16 w-11 rounded-md" />
                  <Skeleton className="h-5 w-[120px]" />
                </div>
                {SKELETON_WIDTHS.map((w) => (
                  <div key={w} className="flex h-[46px] items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <Skeleton className={w} />
                      <Skeleton className="h-3 w-[70px]" />
                    </div>
                    <Skeleton className="size-7 rounded-pill" />
                  </div>
                ))}
              </div>
            )}

            {library.isError && (
              <div className="pt-4">
                <Banner tone="danger" actionLabel="Tentar" onAction={() => void library.refetch()}>
                  Não foi possível carregar os exercícios. Verifique a internet e tente de novo.
                </Banner>
              </div>
            )}

            {ready && sections.length > 0 && (
              <>
                {sections.map((s, si) => (
                  <section
                    key={s.group}
                    aria-label={muscleGroupLabel(s.group)}
                    className="flex animate-guf-rise flex-col gap-2 pt-5"
                    style={{ animationDelay: `${Math.min(si, 6) * 40}ms` }}
                  >
                    <div className="flex items-center gap-3 px-0.5 pb-1">
                      <SectionIcon group={s.group} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h2 className="m-0 text-lg leading-6 font-semibold tracking-[-0.01em]">{muscleGroupLabel(s.group)}</h2>
                        <span className="text-[13px] leading-[18px] text-fg-muted">{plural(s.items.length, "exercício", "exercícios")}</span>
                      </div>
                    </div>
                    {s.items.map((e) => {
                      const isAdded = added.has(e.id);
                      const isOn = selected.includes(e.id) && !isAdded;
                      const equipment = equipmentLabel(e.equipment);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          disabled={isAdded}
                          aria-pressed={isOn}
                          aria-label={`${e.name}, ${equipment}${e.isCustom ? ", personalizado" : ""}${isAdded ? ", já adicionado" : isOn ? ", selecionado" : ""}`}
                          onClick={() => toggle(e.id)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg py-2.5 pr-2.5 pl-3.5 text-left text-fg",
                            "transition-[background-color,border-color,transform] duration-150 ease-standard",
                            isAdded ? "cursor-default border border-border bg-surface opacity-60" : "cursor-pointer active:scale-[.98] motion-reduce:active:scale-100",
                            !isAdded && (isOn ? "border-[1.5px] border-accent-text bg-done-surface" : "border border-border bg-surface"),
                          )}
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-2">
                            <span className={cn("text-base leading-[21px] font-semibold text-pretty", isAdded ? "text-fg-muted" : "text-fg")}>{e.name}</span>
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex h-6 items-center gap-[5px] rounded-[8px] bg-surface-3 px-2 text-xs font-semibold whitespace-nowrap text-fg-secondary">
                                <Icon icon={EQUIPMENT_ICONS[e.equipment] ?? Dumbbell} size={13} />
                                {equipment}
                              </span>
                              {e.isCustom && (
                                <span className="inline-flex h-6 items-center rounded-[8px] bg-info/14 px-2 text-xs font-semibold whitespace-nowrap text-info">Personalizado</span>
                              )}
                              {isAdded && (
                                <span className="inline-flex h-6 items-center gap-1 text-xs font-semibold whitespace-nowrap text-fg-muted">
                                  <Icon icon={Check} size={13} />
                                  Já adicionado
                                </span>
                              )}
                            </span>
                          </span>
                          {/* Espaço da foto do exercício (fotos ainda não existem). */}
                          <span className="relative size-[76px] flex-none">
                            <span aria-hidden="true" className="absolute inset-0 rounded-md border border-dashed border-border-strong bg-surface-3" />
                            {isOn ? (
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "absolute -top-1.5 -right-1.5 grid size-[26px] place-items-center rounded-pill bg-accent text-accent-foreground ring-3 ring-background",
                                  lastPicked === e.id && "animate-guf-pop",
                                )}
                              >
                                <Icon icon={Check} size={15} />
                              </span>
                            ) : (
                              !isAdded && (
                                <span
                                  aria-hidden="true"
                                  className="absolute -top-1.5 -right-1.5 grid size-[26px] place-items-center rounded-pill border-[1.5px] border-border-strong bg-surface-elevated text-fg-secondary ring-3 ring-background"
                                >
                                  <Icon icon={Plus} size={14} />
                                </span>
                              )
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </section>
                ))}
                <div className="pt-5">
                  <SheetOption icon={Plus} title="Criar exercício" dashed onClick={openCreate} />
                </div>
              </>
            )}

            {ready && sections.length === 0 && (
              <div className="animate-guf-rise pt-6">
                <EmptyState
                  icon={SearchX}
                  title="Nenhum exercício encontrado"
                  message={`Nada encontrado para “${query.trim()}”. Confira a grafia ou crie o exercício.`}
                  actionLabel="Criar exercício"
                  onAction={openCreate}
                />
              </div>
            )}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/92 backdrop-blur-[12px]">
          <div className="mx-auto flex max-w-[430px] flex-col gap-1 px-4 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))]">
            {count > 0 && !single && (
              <div className="flex h-11 items-center justify-between">
                <span aria-live="polite" className="flex items-center gap-2 text-sm font-semibold">
                  <b className="grid h-6 min-w-6 place-items-center rounded-pill bg-accent px-[7px] font-display text-[15px] font-bold text-accent-foreground tabular-nums">
                    {count}
                  </b>
                  {count === 1 ? "selecionado" : "selecionados"}
                </span>
                <Button variant="ghost" onClick={() => setSelected([])}>
                  Limpar
                </Button>
              </div>
            )}
            <Button size="lg" fullWidth icon={single ? ArrowLeftRight : Plus} disabled={count === 0} onClick={confirm}>
              {ctaLabel}
            </Button>
          </div>
        </div>

        <BottomSheet placement="screen" open={createOpen} onClose={() => setCreateOpen(false)} title="Criar exercício" subtitle="Personalizado">
          <TextField
            label="Nome do exercício"
            value={newName}
            placeholder="Ex.: Supino articulado"
            error={nameError ?? undefined}
            onChange={(e) => {
              setNewName(e.target.value);
              setNameError(null);
            }}
          />
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-fg-secondary">Grupo muscular</span>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUP_ORDER.map((g) => (
                <Chip key={g} label={muscleGroupLabel(g)} selected={newGroup === g} onChange={() => setNewGroup(g)} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-fg-secondary">Equipamento</span>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(EQUIPMENT_LABELS).map((code) => (
                <Chip key={code} label={equipmentLabel(code)} selected={newEquipment === code} onChange={() => setNewEquipment(code)} />
              ))}
            </div>
          </div>
          <div className="pt-1.5">
            <Button
              size="lg"
              icon={Plus}
              fullWidth
              loading={create.isPending}
              onClick={() => {
                if (!newName.trim()) return setNameError("Informe o nome do exercício.");
                create.mutate();
              }}
            >
              Criar exercício
            </Button>
          </div>
        </BottomSheet>
      </div>
    </ScreenPortal>
  );
}
