"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Check, CircleCheck, Plus, SearchX, X } from "lucide-react";
import type { LibraryExercise } from "@guf/api";
import {
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_ORDER,
  equipmentLabel,
  muscleGroupLabel,
  muscleGroupView,
  normalizeSearch,
  plural,
} from "@guf/core";
import {
  Banner,
  BodyMap,
  BottomSheet,
  Button,
  Chip,
  EmptyState,
  Icon,
  IconButton,
  ScreenPortal,
  SearchField,
  SheetOption,
  Skeleton,
  TextField,
  Toast,
} from "@/components/ds";
import { enqueue } from "@/lib/offline/outbox";
import { addToLibraryCache, loadExerciseLibrary } from "@/lib/offline/workout-repo";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { mockWorkoutApi } from "@/mocks/workout";

export type ExercisePickerMode = "rotina" | "treino" | "troca";

export const EXERCISE_LIBRARY_KEY = "exercise-library";

const TOAST_MS = 1800;
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
  const [filter, setFilter] = useState<string>("todos");
  const [selected, setSelected] = useState<string[]>([]);
  const [lastPicked, setLastPicked] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<string>("peito");
  const [newEquipment, setNewEquipment] = useState<string>("maquina");
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

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
    const q = normalizeSearch(query);
    return MUSCLE_GROUP_ORDER.filter((g) => filter === "todos" || g === filter)
      .map((group) => ({
        group,
        items: exercises.filter(
          (e) =>
            e.muscleGroup === group &&
            (!q || normalizeSearch(e.name).includes(q) || normalizeSearch(equipmentLabel(e.equipment)).includes(q)),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [exercises, filter, query]);

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
      setFilter(exercise.muscleGroup);
      setToast(`${exercise.name} criado`);
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

          <div
            role="group"
            aria-label="Filtrar por grupo muscular"
            className="flex flex-none gap-2 overflow-x-auto px-4 pt-3 pb-1 [scrollbar-width:none]"
          >
            <Chip label="Todos" selected={filter === "todos"} onChange={() => setFilter("todos")} />
            {MUSCLE_GROUP_ORDER.map((g) => (
              <Chip key={g} label={muscleGroupLabel(g)} selected={filter === g} onChange={() => setFilter(g)} />
            ))}
          </div>
          <span className="flex-none px-4 pt-1.5 pb-1 text-[13px] leading-[18px] text-pretty text-fg-muted">{helper}</span>

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
                    className="flex animate-guf-rise flex-col pt-4"
                    style={{ animationDelay: `${Math.min(si, 6) * 40}ms` }}
                  >
                    <div className="flex items-center gap-3 border-b border-border pb-2">
                      <span className="grid h-16 w-11 flex-none place-items-center rounded-md border border-border bg-surface text-fg-muted">
                        <BodyMap muscleGroup={s.group} />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <h2 className="m-0 text-lg leading-6 font-semibold">{muscleGroupLabel(s.group)}</h2>
                        <span className="text-[13px] leading-[18px] text-fg-muted">
                          {plural(s.items.length, "exercício", "exercícios")} ·{" "}
                          {muscleGroupView(s.group) === "back" ? "vista de costas" : "vista de frente"}
                        </span>
                      </div>
                    </div>
                    {s.items.map((e) => {
                      const isAdded = added.has(e.id);
                      const isOn = selected.includes(e.id) && !isAdded;
                      const sub = `${equipmentLabel(e.equipment)}${e.isCustom ? " · Personalizado" : ""}`;
                      return (
                        <button
                          key={e.id}
                          type="button"
                          disabled={isAdded}
                          aria-pressed={isOn}
                          aria-label={`${e.name}, ${sub}${isAdded ? ", já adicionado" : isOn ? ", selecionado" : ""}`}
                          onClick={() => toggle(e.id)}
                          className={cn(
                            "-mx-1.5 flex min-h-[60px] items-center gap-3 rounded-[10px] border-b border-border px-1.5 py-2 text-left",
                            "transition-colors duration-150 ease-standard",
                            isAdded ? "cursor-default" : "cursor-pointer",
                            isOn ? "bg-accent/10" : "bg-transparent",
                          )}
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className={cn("truncate text-[15px] leading-5 font-medium", isAdded ? "text-fg-muted" : "text-fg")}>
                              {e.name}
                            </span>
                            <span className="text-[13px] leading-[18px] text-fg-muted">{sub}</span>
                          </span>
                          {isAdded ? (
                            <span className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-fg-muted">
                              <Icon icon={Check} size={14} />
                              Já adicionado
                            </span>
                          ) : isOn ? (
                            <span
                              aria-hidden="true"
                              className={cn(
                                "grid size-7 flex-none place-items-center rounded-pill bg-accent text-accent-foreground",
                                lastPicked === e.id && "animate-guf-pop",
                              )}
                            >
                              <Icon icon={Check} size={16} />
                            </span>
                          ) : (
                            <span aria-hidden="true" className="size-7 flex-none rounded-pill border-[1.5px] border-border-strong" />
                          )}
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

        {toast && (
          <div
            className={cn(
              "fixed inset-x-4 z-20 mx-auto max-w-[398px] animate-guf-rise-fast",
              count > 0 && !single
                ? "bottom-[calc(162px+env(safe-area-inset-bottom))]"
                : "bottom-[calc(114px+env(safe-area-inset-bottom))]",
            )}
          >
            <Toast message={toast} icon={CircleCheck} />
          </div>
        )}

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
