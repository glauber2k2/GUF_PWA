"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarClock, Moon, Save, Send, Smartphone, Sun, X } from "lucide-react";
import type { AdminAnnouncement } from "@guf/api/admin";
import { parseTargetIds } from "@guf/core";
import { Banner, Button, IconButton, ScreenPortal, SegmentedControl, Skeleton } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { PRIMARY_ACTION_PROPS } from "@/shared/helpers/form-focus";
import { useFormKeyboard } from "@/shared/hooks/use-form-keyboard";
import { useAnnouncement, useAudienceReach } from "@/features/announcements/api/use-announcements-admin";
import { AudienceStep } from "@/features/announcements/components/audience-step";
import { ContentStep } from "@/features/announcements/components/content-step";
import { PhonePreview } from "@/features/announcements/components/phone-preview";
import { PublishDialog } from "@/features/announcements/components/publish-dialog";
import { ReviewStep } from "@/features/announcements/components/review-step";
import { ScheduleStep } from "@/features/announcements/components/schedule-step";
import { StepProgress } from "@/features/announcements/components/step-progress";
import { editorPath, listPath, resultPath } from "@/features/announcements/helpers/announcement-display";
import type { EditorStep } from "@/features/announcements/helpers/editor-state";
import { useAnnouncementEditor } from "@/features/announcements/hooks/use-announcement-editor";
import { MobileActionBar } from "@/shared/components/mobile-action-bar";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useDevice } from "@/shared/hooks/use-device";
import { usePlanNames } from "@/shared/hooks/use-plan-options";
import { useToast } from "@/shared/libs/toast-provider";

type PreviewTheme = "dark" | "light";

const THEME_OPTIONS = [
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "light", label: "Claro", icon: Sun },
];

/** 8 · Novo comunicado ou rascunho (?id=). Publicado não abre aqui: vai para o resultado. */
export function AnnouncementEditorScreen() {
  const params = useSearchParams();
  const id = params.get("id");
  const presetTargetIds = parseTargetIds(params.get("para") ?? "").ids;
  const existing = useAnnouncement(id);
  const router = useRouter();

  if (id && existing.isPending) {
    return (
      <div className="mx-auto flex max-w-[680px] flex-col gap-4 p-6" aria-busy="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (id && existing.isError) {
    return (
      <div className="mx-auto max-w-[680px] p-6">
        <Banner tone="danger" title="Não foi possível abrir o comunicado." actionLabel="Voltar" onAction={() => router.push(listPath())}>
          {existing.error.message}
        </Banner>
      </div>
    );
  }
  if (existing.data && existing.data.state !== "draft") return <RedirectTo path={resultPath(existing.data.id)} />;
  return <Editor key={existing.data?.id ?? "novo"} existing={existing.data} presetTargetIds={presetTargetIds} />;
}

/** Publicado não se edita: leva para o resultado. */
function RedirectTo({ path }: { path: string }) {
  const router = useRouter();
  useEffect(() => router.replace(path), [router, path]);
  return null;
}

function Editor({ existing, presetTargetIds }: { existing: AdminAnnouncement | undefined; presetTargetIds: string[] }) {
  const router = useRouter();
  const device = useDevice();
  const toast = useToast();
  const { can } = useStaff();
  const planNames = usePlanNames();
  const editor = useAnnouncementEditor(existing, presetTargetIds);
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>("dark");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const canPublish = can("publish_announcements");

  const audience = useDebouncedValue(editor.draft.audience, 300);
  const targetIds = useDebouncedValue(editor.targets.ids, 500);
  const reach = useAudienceReach(audience, targetIds);

  const goTo = (step: EditorStep) => editor.setStep(step);
  const saveDraft = async () => {
    const saved = await editor.saveDraft();
    if (!saved) return;
    toast("Rascunho salvo", { tone: "success", message: saved.ignoredIds > 0 ? `${saved.ignoredIds} ids não existem e foram ignorados.` : undefined });
    if (!existing) router.replace(editorPath(saved.id));
  };
  const back = () => (editor.step > 1 ? goTo((editor.step - 1) as EditorStep) : router.push(listPath()));
  const next = () => {
    if (editor.step < 4) return goTo((editor.step + 1) as EditorStep);
    if (!canPublish) return void saveDraft();
    if (editor.publishIssue) return goTo(editor.publishIssue.step);
    setPublishOpen(true);
  };
  const confirmPublish = async () => {
    const scheduled = Boolean(editor.draft.startsAt && editor.draft.startsAt > new Date().toISOString());
    if (await editor.saveAndPublish()) {
      toast(scheduled ? "Comunicado agendado" : "Comunicado publicado", { tone: "success" });
      router.push(listPath(scheduled ? "scheduled" : "active"));
    }
  };

  const scheduled = editor.state.startMode === "later";
  const nextLabel = editor.step < 4 ? "Continuar" : canPublish ? (scheduled ? "Agendar" : "Publicar") : "Salvar rascunho";
  const nextIcon = editor.step < 4 ? ArrowRight : canPublish ? (scheduled ? CalendarClock : Send) : Save;
  const backLabel = editor.step > 1 ? "Voltar" : "Cancelar";
  // Teclado: foco no primeiro campo a cada passo; Enter de campo em campo e, no último, Continuar.
  const formRef = useRef<HTMLDivElement>(null);
  useFormKeyboard(formRef, { focusKey: editor.step, enabled: device !== "mobile" });

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1">
        <div ref={formRef} className="mx-auto flex max-w-[680px] flex-col gap-6 p-4 pb-28 md:p-9">
          <div className="hidden items-center gap-2 md:flex">
            <IconButton icon={ArrowLeft} label="Voltar para comunicados" variant="ghost" onClick={() => router.push(listPath())} />
            <h2 className="m-0 flex-1 text-2xl leading-[30px] font-bold tracking-[-0.02em]">{existing ? "Editar rascunho" : "Novo comunicado"}</h2>
            <Button variant="ghost" icon={Save} loading={editor.isSaving && !editor.isPublishing} onClick={() => void saveDraft()}>
              Salvar rascunho
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 md:hidden">
            <Button variant="ghost" icon={Smartphone} onClick={() => setPreviewOpen(true)} className="-ml-3">
              Ver prévia
            </Button>
            <Button variant="ghost" icon={Save} onClick={() => void saveDraft()}>
              Salvar
            </Button>
          </div>
          <StepProgress step={editor.step} onStep={goTo} />

          {editor.error && !publishOpen && <Banner tone="danger">{editor.error.message}</Banner>}
          {!canPublish && editor.step === 4 && (
            <Banner tone="info" title="Seu papel cria rascunhos.">
              Uma pessoa admin revisa e publica.
            </Banner>
          )}

          {editor.step === 1 && <ContentStep draft={editor.draft} onChange={editor.updateDraft} />}
          {editor.step === 2 && (
            <AudienceStep
              audience={editor.draft.audience}
              idsText={editor.state.idsText}
              targetCount={editor.targets.ids.length}
              invalidIdCount={editor.targets.invalidCount}
              reach={reach.data}
              isReachLoading={reach.isFetching}
              planNames={planNames}
              onAudience={editor.setAudience}
              onIdsText={(idsText) => editor.update({ idsText })}
            />
          )}
          {editor.step === 3 && <ScheduleStep state={editor.state} onChange={editor.update} onDraft={editor.updateDraft} />}
          {editor.step === 4 && (
            <ReviewStep
              draft={editor.draft}
              reach={reach.data}
              targetCount={editor.targets.ids.length}
              planNames={planNames}
              issue={canPublish ? editor.publishIssue : null}
              onPurpose={(purpose) => editor.updateDraft({ purpose })}
              onGoTo={goTo}
            />
          )}

          <div className="hidden justify-between gap-3 border-t border-border pt-2 md:flex">
            <Button variant="secondary" size="tall" onClick={back}>
              {backLabel}
            </Button>
            <Button size="tall" iconRight={nextIcon} onClick={next} loading={editor.step === 4 && editor.isSaving} {...PRIMARY_ACTION_PROPS}>
              {nextLabel}
            </Button>
          </div>
        </div>
      </div>

      {device !== "mobile" && (
        <aside aria-label="Prévia ao vivo" className="sticky top-0 flex h-[calc(100dvh-64px)] w-[clamp(300px,30vw,440px)] flex-none flex-col items-center gap-4 overflow-auto border-l border-border bg-surface px-4 py-6">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className="text-overline font-semibold tracking-[.08em] text-fg-muted uppercase">Prévia no app</span>
            <SegmentedControl size="sm" label="Tema da prévia" options={THEME_OPTIONS} value={previewTheme} onChange={(v) => setPreviewTheme(v as PreviewTheme)} />
          </div>
          <div className={device === "tablet" ? "origin-top scale-[.8]" : undefined}>
            <PhonePreview draft={editor.draft} theme={previewTheme} />
          </div>
          <span className="text-center text-[12.5px] text-fg-muted">Como aparece na Início do app guf</span>
        </aside>
      )}

      {device === "mobile" && (
        <MobileActionBar>
          <Button variant="secondary" size="tall" fullWidth className="flex-1" onClick={back}>
            {backLabel}
          </Button>
          <Button size="tall" fullWidth className="flex-[1.4]" onClick={next} loading={editor.step === 4 && editor.isSaving}>
            {nextLabel}
          </Button>
        </MobileActionBar>
      )}

      {previewOpen && (
        <ScreenPortal>
          <div role="dialog" aria-modal="true" aria-label="Prévia no app" className="fixed inset-0 z-[70] flex flex-col bg-surface">
            <div className="flex h-14 items-center gap-2 border-b border-border pr-2 pl-4">
              <strong className="flex-1 text-[17px]">Prévia no app</strong>
              <SegmentedControl size="sm" label="Tema da prévia" options={THEME_OPTIONS} value={previewTheme} onChange={(v) => setPreviewTheme(v as PreviewTheme)} />
              <IconButton icon={X} label="Fechar prévia" variant="ghost" onClick={() => setPreviewOpen(false)} />
            </div>
            <div className="grid flex-1 place-items-center overflow-auto p-4">
              <PhonePreview draft={editor.draft} theme={previewTheme} />
            </div>
          </div>
        </ScreenPortal>
      )}

      {publishOpen && (
        <PublishDialog
          reach={reach.data}
          startsAt={editor.draft.startsAt}
          isPublishing={editor.isSaving || editor.isPublishing}
          errorMessage={editor.error?.message ?? null}
          onClose={() => setPublishOpen(false)}
          onConfirm={() => void confirmPublish()}
        />
      )}
    </div>
  );
}
