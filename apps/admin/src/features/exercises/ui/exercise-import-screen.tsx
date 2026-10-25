"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Banner, Button } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { ImportReviewStep } from "@/features/exercises/components/import-review-step";
import { ImportUploadStep } from "@/features/exercises/components/import-upload-step";
import { EXERCISES_PATH } from "@/features/exercises/helpers/paths";
import { useCatalogImport } from "@/features/exercises/hooks/use-catalog-import";
import { AdminOnly } from "@/shared/components/admin-only";
import { Dialog, DialogActions } from "@/shared/components/dialog";
import { MobileActionBar } from "@/shared/components/mobile-action-bar";
import { PageBody, PageTitle } from "@/shared/components/panel";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { useToast } from "@/shared/libs/toast-provider";
import { PRIMARY_ACTION_PROPS } from "@/shared/helpers/form-focus";
import { useFormKeyboard } from "@/shared/hooks/use-form-keyboard";

function exercisesCountLabel(count: number): string {
  return count === 1 ? "1 exercício" : `${count} exercícios`;
}

/** Importar exercícios de um arquivo (só admin): enviar → revisar a conversão → confirmar o cadastro. */
export function ExerciseImportScreen() {
  const { can, staff } = useStaff();
  if (!can("manage_exercises")) return <AdminOnly role={staff.role} />;
  return <ExerciseImport />;
}

function ExerciseImport() {
  const router = useRouter();
  const toast = useToast();
  const importer = useCatalogImport();
  const [isConfirming, setIsConfirming] = useState(false);
  const { counts, fileName } = importer;
  const canSubmit = counts.ready > 0 && counts.blocking === 0;
  const submitLabel = `Cadastrar ${exercisesCountLabel(counts.ready)}`;

  const confirm = () =>
    importer.submit((created, duplicates) => {
      setIsConfirming(false);
      const skipped = duplicates.length > 0 ? ` ${exercisesCountLabel(duplicates.length)} já estava${duplicates.length === 1 ? "" : "m"} no catálogo.` : "";
      toast(`${exercisesCountLabel(created.length)} cadastrado${created.length === 1 ? "" : "s"} no catálogo.${skipped}`, { tone: "success" });
      router.push(withDevState(EXERCISES_PATH));
    });

  // Teclado: na revisão, Enter anda pelos campos de cada linha e, no último, abre a confirmação.
  const pageRef = useRef<HTMLDivElement>(null);
  useFormKeyboard(pageRef, { focusKey: fileName ?? "upload", enabled: Boolean(fileName) });

  const submitButton = (
    <Button icon={Check} disabled={!canSubmit} onClick={() => setIsConfirming(true)} {...PRIMARY_ACTION_PROPS}>
      {submitLabel}
    </Button>
  );

  return (
    <PageBody wide>
      <div ref={pageRef} className="contents">
        <div className="flex flex-col gap-1">
          <PageTitle actions={fileName ? submitButton : undefined}>Importar exercícios</PageTitle>
          <p className="m-0 text-fg-secondary">
            {fileName
              ? "Confira a conversão. Nada foi cadastrado ainda: ajuste o que for preciso e confirme."
              : "Envie uma lista de exercícios. O arquivo é lido no seu navegador e só entra no catálogo depois da sua confirmação."}
          </p>
        </div>

        {fileName ? (
          <ImportReviewStep
            fileName={fileName}
            rows={importer.rows}
            issues={importer.issues}
            counts={counts}
            isCheckingExisting={importer.isCheckingExisting}
            checkError={importer.checkError}
            onRetryCheck={importer.retryCheck}
            onChange={importer.updateRow}
            onRemove={importer.removeRow}
            onRemoveSkipped={importer.removeSkipped}
            onChangeFile={importer.reset}
          />
        ) : (
          <ImportUploadStep isReading={importer.isReading} error={importer.fileError} onFile={(file) => void importer.readFile(file)} />
        )}
      </div>

      {fileName && (
        <MobileActionBar>
          <Button size="tall" icon={Check} fullWidth disabled={!canSubmit} onClick={() => setIsConfirming(true)}>
            {submitLabel}
          </Button>
        </MobileActionBar>
      )}

      {isConfirming && (
        <Dialog open title={`${submitLabel}?`} onClose={() => !importer.isSubmitting && setIsConfirming(false)}>
          <span className="text-fg-secondary">
            Eles entram no catálogo do guf e aparecem para todas as pessoas no seletor de exercícios do app. O cadastro fica registrado na auditoria.
          </span>
          {counts.skipped > 0 && <span className="text-[13px] text-fg-muted">{counts.skipped === 1 ? "1 repetido fica de fora." : `${counts.skipped} repetidos ficam de fora.`}</span>}
          {importer.submitError && <Banner tone="danger">{importer.submitError.message}</Banner>}
          <DialogActions>
            <Button variant="secondary" size="tall" fullWidth disabled={importer.isSubmitting} onClick={() => setIsConfirming(false)}>
              Voltar
            </Button>
            <Button size="tall" icon={Check} fullWidth loading={importer.isSubmitting} onClick={confirm}>
              Cadastrar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </PageBody>
  );
}
