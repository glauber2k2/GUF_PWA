"use client";

import { useMemo, useReducer, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Check, ChevronDown, ChevronLeft, ClipboardList, Dumbbell, Plus, SearchX, Star, NotepadText, Trash2 } from "lucide-react";
import { routineDraftSummary, routineLetter, routineShortName, type IsoWeekday } from "@guf/core";
import { routineDraftSchema } from "@guf/schemas";
import { apiError, type ApiError, type LibraryExercise, type Project, type RoutineDraft } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import {
  AnimatePresence,
  Banner,
  BottomSheet,
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  IconButton,
  LAYOUT_ITEM_PROPS,
  LayoutItem,
  SavingOverlay,
  SheetOption,
  Skeleton,
  Switch,
  TextField,
} from "@/shared/components/ds";
import { useProfile } from "@/features/profile";
import { ExercisePicker } from "@/features/exercise-picker";
import { OfflineEditBanner } from "@/features/projects";
import { PROJECTS_PATH, projectDetailPath } from "@/features/projects";
import { usePointerReorder } from "@/shared/hooks/use-pointer-reorder";
import { useCanEditPlanning, useProjectsOverview, useProjectsSource } from "@/features/projects";
import { useRoutine, useRoutinesSource } from "@/features/routine/api/use-routine";
import { flushOutbox } from "@/shared/offline/outbox";
import { invalidatePlanningData } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { cn } from "@/shared/helpers/class-names";
import { draftReducer, isDraftDirty, toPlannedExercise } from "@/features/routine/helpers/routine-draft";
import { RoutineExerciseCard } from "@/features/routine/components/routine-exercise-card";
import { WeekdayPicker } from "@/features/routine/components/weekday-picker";

/** /rotina?id=… (editar) ou /rotina?projeto=… (nova): carrega e abre o editor. */
export function RoutineEditorScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const routineId = params.get("id");
  const projectParam = params.get("projeto");
  const routine = useRoutine(routineId);
  const overview = useProjectsOverview();
  const { dev } = useProjectsSource();
  const back = () => router.push(PROJECTS_PATH);

  if (dev.forceLoading || overview.isPending || (routineId && routine.isPending)) {
    return (
      <EditorFrame title="Rotina" onBack={back}>
        <div aria-busy="true" aria-label="Carregando rotina" className="flex flex-col gap-4">
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-[52px] rounded-md" />
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} className="h-[72px] rounded-lg" />
          ))}
        </div>
      </EditorFrame>
    );
  }

  const loadError = overview.error ?? routine.error;
  if (loadError || !overview.data) {
    const notFound = (loadError as ApiError | null)?.code === "routine_not_found";
    return (
      <EditorFrame title="Rotina" onBack={back}>
        {notFound ? (
          <EmptyState icon={SearchX} title="Rotina não encontrada" message="Ela pode ter sido arquivada. Volte para Projetos." actionLabel="Ver projetos" onAction={back} />
        ) : (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void Promise.all([overview.refetch(), routine.refetch()])}>
            Não foi possível carregar a rotina. Verifique a internet e tente de novo.
          </Banner>
        )}
      </EditorFrame>
    );
  }

  const projects = overview.data.projects.filter((p) => !p.archivedAt);
  const initial: RoutineDraft | null =
    routine.data ??
    (!routineId && projects.some((p) => p.id === projectParam)
      ? { id: null, projectId: projectParam as string, name: "", weekdays: [], autoProgress: true, exercises: [] }
      : null);
  if (!initial) {
    return (
      <EditorFrame title="Nova rotina" onBack={back}>
        <EmptyState icon={SearchX} title="Projeto não encontrado" message="Crie a rotina a partir de um projeto em uso." actionLabel="Ver projetos" onAction={back} />
      </EditorFrame>
    );
  }
  return <RoutineEditor key={initial.id ?? "nova"} initial={initial} projects={projects} />;
}

type Sheet = { kind: "menu" | "note"; exerciseId: string } | { kind: "project" } | null;

function RoutineEditor({ initial, projects }: { initial: RoutineDraft; projects: Project[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const shell = useAppShell();
  const canEdit = useCanEditPlanning();
  const { api, mock } = useRoutinesSource();
  // Carga planejada na unidade do usuário (o banco guarda kg).
  const unit = useProfile().data?.weightUnit ?? "kg";
  const [draft, dispatch] = useReducer(draftReducer, initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [picker, setPicker] = useState<{ mode: "rotina" | "troca"; exerciseId?: string } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const project = projects.find((p) => p.id === draft.projectId) ?? null;
  const dirty = isDraftDirty(initial, draft);
  const disabled = !canEdit || saving;
  const target = sheet && "exerciseId" in sheet ? draft.exercises.find((e) => e.id === sheet.exerciseId) : undefined;
  const nameError = showErrors && !draft.name.trim() ? "Dê um nome para a rotina, como “Treino A”." : undefined;

  const reorder = usePointerReorder({
    items: draft.exercises,
    disabled,
    onCommit: (exercises) => dispatch({ type: "reorder", exercises }),
  });

  // Outras rotinas do projeto em cada dia (bolinha no seletor de dias).
  const otherRoutines = useMemo(() => {
    const byDay = new Map<number, string[]>();
    for (const r of project?.routines ?? []) {
      if (r.id === draft.id) continue;
      for (const day of r.weekdays) byDay.set(day, [...(byDay.get(day) ?? []), routineShortName(r.name)]);
    }
    return byDay;
  }, [project, draft.id]);

  const leave = () => router.push(projectDetailPath(initial.projectId));
  const requestLeave = () => (dirty ? setConfirmLeave(true) : leave());

  const save = async () => {
    const parsed = routineDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setShowErrors(true);
      if (draft.exercises.length === 0) shell.showToast("Adicione pelo menos 1 exercício", { tone: "warning" });
      const invalid = draft.exercises.find((e) => !e.targetReps.trim());
      if (invalid) setOpenId(invalid.id);
      return;
    }
    if (!canEdit) return setSaveError(apiError("network_error"));
    setSaving(true);
    setSaveError(null);
    // Exercícios criados no seletor entram pela fila: enviar antes de gravar a rotina.
    if (!mock) await flushOutbox();
    const { error } = await api.saveRoutine(getSupabaseClient(), draft);
    if (error) {
      setSaving(false);
      return setSaveError(error);
    }
    await invalidatePlanningData(queryClient);
    shell.showToast(draft.id ? "Rotina salva" : "Rotina criada", { tone: "success" });
    // Salvou: volta para o projeto da rotina (o "Salvando rotina" fica até a troca de tela).
    router.replace(projectDetailPath(draft.projectId));
  };

  const onPicked = (chosen: LibraryExercise[]) => {
    const current = picker;
    setPicker(null);
    const first = chosen[0];
    if (!current || !first) return;
    if (current.mode === "troca" && current.exerciseId) {
      dispatch({ type: "replaceExercise", id: current.exerciseId, exercise: first });
      return shell.showToast("Exercício trocado", { tone: "success", icon: ArrowLeftRight });
    }
    const planned = chosen.map(toPlannedExercise);
    dispatch({ type: "addExercises", exercises: planned });
    // Um exercício só: o cartão já abre para ajustar séries, repetições e descanso.
    if (planned.length === 1) setOpenId(planned[0]?.id ?? null);
    shell.showToast(chosen.length === 1 ? `${first.name} adicionado` : `${chosen.length} exercícios adicionados`, { tone: "success", icon: Plus });
    // Rola até o fim, onde os novos entraram.
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  };

  const remove = (exerciseId: string) => {
    const index = draft.exercises.findIndex((e) => e.id === exerciseId);
    const exercise = draft.exercises[index];
    setSheet(null);
    if (!exercise) return;
    dispatch({ type: "removeExercise", id: exerciseId });
    shell.showToast(`${exercise.name} removido`, {
      tone: "undo",
      icon: Trash2,
      actionLabel: "Desfazer",
      onAction: () => dispatch({ type: "restoreExercise", index, exercise }),
    });
  };

  return (
    <EditorFrame
      title={draft.name.trim() || "Nova rotina"}
      projectName={project?.name}
      onBack={requestLeave}
      action={
        <Button variant="secondary" icon={Check} disabled={!canEdit} loading={saving} onClick={() => void save()} className="rounded-pill pr-4 pl-3.5">
          Salvar
        </Button>
      }
      bottomBar={
        <Button variant={draft.exercises.length ? "primary" : "secondary"} size="lg" icon={Plus} fullWidth disabled={disabled} onClick={() => setPicker({ mode: "rotina" })}>
          Adicionar exercício
        </Button>
      }
    >
      {!canEdit && <OfflineEditBanner />}
      {saveError && (
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void save()} className="animate-guf-rise-fast">
          {saveError.code === "network_error" ? "Não foi possível salvar a rotina. Verifique a internet e tente de novo." : saveError.message}
        </Banner>
      )}

      <TextField
        label="Nome da rotina"
        value={draft.name}
        maxLength={100}
        placeholder="Ex.: Treino A – Peito e Tríceps"
        disabled={disabled}
        error={nameError}
        onChange={(e) => dispatch({ type: "setName", name: e.target.value })}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-fg-secondary">Projeto</span>
        <button
          type="button"
          aria-haspopup="dialog"
          disabled={disabled}
          onClick={() => setSheet({ kind: "project" })}
          className="flex h-12 cursor-pointer items-center gap-2.5 rounded-md border border-border-strong bg-background pr-3 pl-3.5 text-left text-base text-fg transition-colors duration-150 ease-standard hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon icon={ClipboardList} size={18} className="text-fg-muted" />
          <span className="min-w-0 flex-1 truncate">{project?.name ?? "Escolha um projeto"}</span>
          <Icon icon={ChevronDown} size={18} className="text-fg-muted" />
        </button>
      </div>

      <WeekdayPicker
        value={draft.weekdays}
        otherRoutines={otherRoutines}
        disabled={disabled}
        onToggle={(day: IsoWeekday) => dispatch({ type: "toggleDay", day })}
      />

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3.5">
        <Switch
          label="Atualizar carga e repetições automaticamente"
          checked={draft.autoProgress}
          disabled={disabled}
          onChange={(on) => dispatch({ type: "setAutoProgress", autoProgress: on })}
          className="leading-5 font-semibold"
        />
        <span className="text-[13px] leading-[18px] text-pretty text-fg-muted">
          {draft.autoProgress
            ? "O próximo treino já começa com a carga e as repetições do último."
            : "O próximo treino começa com a carga e as repetições definidas em cada exercício abaixo (ou vazio)."}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2 pt-2">
        <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Exercícios</span>
        <span aria-live="polite" className="text-[13px] leading-[18px] text-fg-secondary tabular-nums">
          {routineDraftSummary(draft.exercises)}
        </span>
      </div>

      {draft.exercises.length === 0 ? (
        <div className="animate-guf-rise-fast">
          <EmptyState
            icon={Dumbbell}
            title="Nenhum exercício ainda"
            message="Adicione os exercícios desta rotina."
            actionLabel={canEdit ? "Adicionar exercício" : undefined}
            onAction={() => setPicker({ mode: "rotina" })}
            className={cn(showErrors && "border-danger")}
          />
        </div>
      ) : (
        <div role="list" aria-label="Exercícios da rotina" className="relative flex flex-col gap-2">
          {/* Os outros exercícios deslizam para o lugar ao reordenar, remover ou desfazer. */}
          <AnimatePresence initial={false} mode="popLayout">
            {reorder.order.map((exercise) => (
              <LayoutItem
                key={exercise.id}
                role="presentation"
                {...LAYOUT_ITEM_PROPS}
                className={cn("flex flex-col", reorder.draggingId === exercise.id && "relative z-10")}
              >
                <RoutineExerciseCard
                  exercise={exercise}
                  open={openId === exercise.id}
                  dragging={reorder.draggingId === exercise.id}
                  disabled={disabled}
                  showErrors={showErrors}
                  unit={unit}
                  showTargetWeight={!draft.autoProgress}
                  itemRef={reorder.itemRef(exercise.id)}
                  handleProps={reorder.handleProps(exercise.id)}
                  onToggle={() => setOpenId(openId === exercise.id ? null : exercise.id)}
                  onMenu={() => setSheet({ kind: "menu", exerciseId: exercise.id })}
                  dispatch={dispatch}
                />
              </LayoutItem>
            ))}
          </AnimatePresence>
        </div>
      )}

      <BottomSheet placement="screen" open={sheet?.kind === "menu"} onClose={() => setSheet(null)} title={target?.name}>
        {target && (
          <>
            <SheetOption
              icon={NotepadText}
              title={target.notes ? "Editar observação" : "Adicionar observação"}
              subtitle="Aparece no treino, acima das séries"
              onClick={() => {
                setNoteDraft(target.notes);
                setSheet({ kind: "note", exerciseId: target.id });
              }}
            />
            <SheetOption
              icon={ArrowLeftRight}
              title="Trocar exercício"
              subtitle="Mantém séries, repetições e descanso"
              onClick={() => {
                setSheet(null);
                setPicker({ mode: "troca", exerciseId: target.id });
              }}
            />
            <SheetOption icon={Trash2} title="Remover exercício" subtitle="Dá para desfazer logo depois" onClick={() => remove(target.id)} />
          </>
        )}
      </BottomSheet>

      <BottomSheet placement="screen" open={sheet?.kind === "note"} onClose={() => setSheet(null)} title="Observação" subtitle={target?.name}>
        <TextField
          label="Observação"
          value={noteDraft}
          maxLength={500}
          placeholder="Ex.: cotovelos colados ao corpo"
          onChange={(e) => setNoteDraft(e.target.value)}
        />
        <Button
          size="tall"
          fullWidth
          onClick={() => {
            if (target) dispatch({ type: "updateExercise", id: target.id, patch: { notes: noteDraft.trim() } });
            setSheet(null);
          }}
        >
          Salvar
        </Button>
      </BottomSheet>

      <BottomSheet placement="screen" open={sheet?.kind === "project"} onClose={() => setSheet(null)} title="Projeto">
        {projects.map((p) => {
          const current = p.id === draft.projectId;
          const meta = `${p.routines.length} ${p.routines.length === 1 ? "rotina" : "rotinas"}${p.isActive ? " · ativo" : ""}`;
          return (
            <SheetOption
              key={p.id}
              icon={current ? Check : p.isFavorites ? Star : undefined}
              letter={routineLetter(p.name)}
              title={p.name}
              subtitle={current ? `Selecionado · ${meta}` : meta}
              onClick={() => {
                dispatch({ type: "setProject", projectId: p.id });
                setSheet(null);
              }}
            />
          );
        })}
      </BottomSheet>

      {/* Gravando: bloqueia a tela (evita toque duplo) até voltar para o projeto. */}
      <SavingOverlay open={saving} title="Salvando rotina" message="Leva só um instante." variant={2} />

      <ConfirmDialog
        placement="screen"
        open={confirmLeave}
        title="Sair sem salvar?"
        message="As mudanças nesta rotina ainda não foram salvas."
        cancelLabel="Continuar editando"
        confirmLabel="Sair sem salvar"
        destructive
        onCancel={() => setConfirmLeave(false)}
        onConfirm={leave}
      />

      {picker && (
        <ExercisePicker
          mode={picker.mode}
          addedExerciseIds={draft.exercises.map((e) => e.exerciseId)}
          offline={!canEdit}
          persist={!mock}
          onClose={() => setPicker(null)}
          onConfirm={onPicked}
        />
      )}
    </EditorFrame>
  );
}

/** Moldura da tela: header (voltar, projeto, nome e "Salvar"), conteúdo e barra fixa "Adicionar exercício". */
function EditorFrame({
  title,
  projectName,
  onBack,
  action,
  bottomBar,
  children,
}: {
  title: string;
  projectName?: string;
  onBack: () => void;
  action?: ReactNode;
  bottomBar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col pb-[calc(112px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-[5] border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <div className="flex h-14 items-center gap-2 pr-3 pl-1.5">
          <IconButton icon={ChevronLeft} variant="ghost" label="Voltar" onClick={onBack} />
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            {projectName && (
              <span className="flex items-center gap-1.5 overflow-hidden text-[11px] leading-4 font-semibold tracking-[0.08em] whitespace-nowrap text-accent-text uppercase">
                <Icon icon={ClipboardList} size={12} />
                <span className="truncate">{projectName}</span>
              </span>
            )}
            <h1 className="m-0 truncate text-lg leading-6 font-semibold tracking-[-0.015em]">{title}</h1>
          </div>
          {action}
        </div>
      </header>
      <div className="flex animate-guf-rise flex-col gap-4 px-4 pt-4">{children}</div>
      {bottomBar && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/92 backdrop-blur-[12px]">
          <div className="mx-auto max-w-[430px] px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">{bottomBar}</div>
        </div>
      )}
    </main>
  );
}
