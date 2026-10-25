"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, FileUp, Plus } from "lucide-react";
import type { CatalogExercise } from "@guf/api/admin";
import type { MuscleGroupCode } from "@guf/core";
import { Banner, Button, EmptyState, SearchField, Skeleton } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { useCatalogExercises } from "@/features/exercises/api/use-exercise-catalog";
import { CatalogExerciseList } from "@/features/exercises/components/catalog-exercise-list";
import { DeleteExerciseDialog } from "@/features/exercises/components/delete-exercise-dialog";
import { EditExerciseDialog } from "@/features/exercises/components/edit-exercise-dialog";
import { MuscleGroupFilter } from "@/features/exercises/components/muscle-group-filter";
import { NewExerciseDialog } from "@/features/exercises/components/new-exercise-dialog";
import { CATALOG_SHORTCUT_HINTS } from "@/features/exercises/constants/catalog-shortcuts";
import { EXERCISE_IMPORT_PATH } from "@/features/exercises/helpers/paths";
import { useCatalogShortcuts } from "@/features/exercises/hooks/use-catalog-shortcuts";
import { KeyboardHints } from "@/shared/components/keyboard-hints";
import { MobileActionBar } from "@/shared/components/mobile-action-bar";
import { PageBody, PageTitle } from "@/shared/components/panel";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useDevAdminState } from "@/shared/hooks/use-dev-admin-state";
import { useDevice } from "@/shared/hooks/use-device";
import { useToast } from "@/shared/libs/toast-provider";

const SEARCH_DELAY_MS = 350;

type CatalogDialog = { kind: "new" } | { kind: "edit"; exercise: CatalogExercise } | { kind: "delete"; exercise: CatalogExercise } | null;

/** Catálogo de exercícios do guf: busca, filtro por vários grupos musculares e cadastro (manual ou por arquivo). */
export function ExercisesScreen() {
  const router = useRouter();
  const dev = useDevAdminState();
  const toast = useToast();
  const { can } = useStaff();
  const canManage = can("manage_exercises");
  const [query, setQuery] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupCode[]>([]);
  const device = useDevice();
  const [dialog, setDialog] = useState<CatalogDialog>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DELAY_MS);
  const catalog = useCatalogExercises({ query: debouncedQuery || undefined, muscleGroups });
  const exercises = catalog.data?.pages.flatMap((page) => page.items) ?? [];
  const total = catalog.data?.pages[0]?.total ?? 0;
  const hasFilters = Boolean(debouncedQuery) || muscleGroups.length > 0;
  const openImport = () => router.push(withDevState(EXERCISE_IMPORT_PATH));
  const openNew = () => setDialog({ kind: "new" });
  const openFor = (kind: "edit" | "delete") => (id: string) => {
    const exercise = exercises.find((e) => e.id === id);
    if (exercise) setDialog({ kind, exercise });
  };
  const rowActions = canManage
    ? { onEdit: (exercise: CatalogExercise) => setDialog({ kind: "edit", exercise }), onDelete: (exercise: CatalogExercise) => setDialog({ kind: "delete", exercise }) }
    : undefined;
  const showShortcuts = canManage && device === "desktop";
  useCatalogShortcuts({ onNew: openNew, onImport: openImport, onEdit: openFor("edit"), onDelete: openFor("delete") }, showShortcuts);
  const done = (message: string) => toast(message, { tone: "success" });
  const closeDialog = () => setDialog(null);
  const clearFilters = () => {
    setQuery("");
    setMuscleGroups([]);
  };

  const actions = canManage && (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" icon={FileUp} onClick={openImport}>
        Importar arquivo
      </Button>
      <Button icon={Plus} onClick={openNew}>
        Novo exercício
      </Button>
    </div>
  );

  return (
    <PageBody wide>
      <div className="flex flex-col gap-1">
        <PageTitle actions={actions}>Exercícios</PageTitle>
        <p className="m-0 text-fg-secondary">Catálogo do guf: o que entra aqui aparece para todas as pessoas no seletor de exercícios do app.</p>
      </div>

      <div className="flex flex-col gap-4">
        <SearchField aria-label="Buscar exercício" placeholder="Buscar pelo nome" value={query} onChange={(e) => setQuery(e.target.value)} />
        <MuscleGroupFilter selected={muscleGroups} onChange={setMuscleGroups} />
      </div>

      {showShortcuts && <KeyboardHints hints={CATALOG_SHORTCUT_HINTS} />}

      {dev.forceLoading || catalog.isPending ? (
        <div aria-busy="true" aria-label="Carregando exercícios" className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-13 rounded-md" />
          ))}
        </div>
      ) : catalog.isError ? (
        <Banner tone="danger" title="Não foi possível carregar os exercícios." actionLabel="Tentar de novo" onAction={() => void catalog.refetch()}>
          {catalog.error.message}
        </Banner>
      ) : exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={hasFilters ? "Nenhum exercício com esses filtros" : "O catálogo está vazio"}
          message={hasFilters ? "Mude a busca ou marque outros grupos musculares." : "Cadastre o primeiro exercício ou importe um arquivo."}
          actionLabel={hasFilters ? "Limpar filtros" : undefined}
          onAction={hasFilters ? clearFilters : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <span aria-live="polite" className="text-[13px] text-fg-secondary tabular-nums">
            {total === 1 ? "1 exercício" : `${total} exercícios`}
          </span>
          <CatalogExerciseList exercises={exercises} actions={rowActions} />
          {catalog.hasNextPage && (
            <Button variant="secondary" loading={catalog.isFetchingNextPage} onClick={() => void catalog.fetchNextPage()} className="self-center">
              Carregar mais
            </Button>
          )}
        </div>
      )}

      {canManage && (
        <MobileActionBar>
          <Button variant="secondary" size="tall" icon={FileUp} fullWidth onClick={openImport}>
            Importar
          </Button>
          <Button size="tall" icon={Plus} fullWidth onClick={openNew}>
            Novo
          </Button>
        </MobileActionBar>
      )}

      {dialog?.kind === "new" && <NewExerciseDialog onClose={closeDialog} onDone={done} />}
      {dialog?.kind === "edit" && <EditExerciseDialog exercise={dialog.exercise} onClose={closeDialog} onDone={done} />}
      {dialog?.kind === "delete" && <DeleteExerciseDialog exercise={dialog.exercise} onClose={closeDialog} onDone={done} />}
    </PageBody>
  );
}
