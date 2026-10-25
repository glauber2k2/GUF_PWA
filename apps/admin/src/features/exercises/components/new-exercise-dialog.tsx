"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { EquipmentCode, MuscleGroupCode } from "@guf/core";
import { catalogExerciseSchema } from "@guf/schemas";
import { Banner, Button, TextField } from "@guf/ui";
import { useCreateCatalogExercises } from "@/features/exercises/api/use-exercise-catalog";
import { EquipmentSelect, MuscleGroupSelect } from "@/features/exercises/components/exercise-fields";
import { Dialog, DialogActions } from "@/shared/components/dialog";

interface NewExerciseDialogProps {
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Cadastro manual de um exercício no catálogo (aparece para todas as contas no app). */
export function NewExerciseDialog({ onClose, onDone }: NewExerciseDialogProps) {
  const create = useCreateCatalogExercises();
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroupCode | null>(null);
  const [equipment, setEquipment] = useState<EquipmentCode>("outro");
  const [tried, setTried] = useState(false);
  const parsed = catalogExerciseSchema.safeParse({ name, muscleGroup, equipment });
  const fieldError = (field: string) => (tried && !parsed.success ? parsed.error.issues.find((i) => i.path[0] === field)?.message : undefined);

  const save = () => {
    setTried(true);
    if (!parsed.success) return;
    create.mutate(
      { exercises: [parsed.data], source: "manual" },
      {
        onSuccess: ({ created }) => {
          if (created.length === 0) return;
          onDone(`"${parsed.data.name}" cadastrado no catálogo`);
          onClose();
        },
      },
    );
  };

  const isDuplicate = create.data?.created.length === 0;

  return (
    <Dialog open title="Novo exercício" subtitle="Entra no catálogo do guf e aparece para todas as pessoas no app." onClose={onClose} showClose>
      <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} error={fieldError("name")} hint="Ex.: Supino inclinado com halteres" />
      <MuscleGroupSelect label="Grupo muscular" value={muscleGroup} onChange={setMuscleGroup} error={fieldError("muscleGroup")} />
      <EquipmentSelect label="Equipamento" value={equipment} onChange={setEquipment} error={fieldError("equipment")} />
      {isDuplicate && <Banner tone="warning">Já existe um exercício com esse nome no catálogo. Use outro nome.</Banner>}
      {create.error && <Banner tone="danger">{create.error.message}</Banner>}
      <DialogActions>
        <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
          Cancelar
        </Button>
        <Button size="tall" icon={Plus} fullWidth loading={create.isPending} onClick={save}>
          Cadastrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
