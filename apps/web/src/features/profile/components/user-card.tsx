"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Pencil } from "lucide-react";
import { trainingSinceLabel } from "@guf/core";
import { NAME_MAX_LENGTH, profileNameSchema, type ProfileNameValues } from "@guf/schemas";
import type { Profile } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import { Avatar, Banner, BottomSheet, Button, Icon, TextField } from "@/shared/components/ds";
import { useUpdateProfile } from "@/features/profile/api/use-profile";

/** Cartão do topo: avatar com a inicial, nome, e-mail, "Treinando desde…" e "Editar" (nome). */
export function UserCard({ profile, canEdit }: { profile: Profile; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <section aria-label="Seus dados" className="flex flex-none animate-guf-rise flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-e1">
      <div className="flex items-center gap-3.5">
        <Avatar size="lg" tone="accent" src={profile.avatarUrl} name={profile.name} email={profile.email} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[19px] leading-6 font-semibold tracking-[-0.01em]">{profile.name || "Sem nome"}</span>
          {profile.email && <span className="truncate text-sm leading-5 text-fg-secondary">{profile.email}</span>}
        </div>
        <button
          type="button"
          aria-label="Editar nome"
          disabled={!canEdit}
          onClick={() => setEditing(true)}
          className={[
            "flex h-11 flex-none cursor-pointer items-center gap-1.5 rounded-md border border-border-strong bg-transparent px-3 text-sm font-semibold text-fg",
            "transition-transform duration-100 ease-standard hover:bg-surface-3 active:scale-[.97] motion-reduce:active:scale-100",
            "disabled:cursor-not-allowed disabled:opacity-50",
          ].join(" ")}
        >
          <Icon icon={Pencil} size={16} />
          Editar
        </button>
      </div>
      <span className="flex items-center gap-2 border-t border-border pt-3.5 text-sm leading-5 text-fg-secondary tabular-nums">
        <Icon icon={CalendarCheck} size={16} className="text-fg-muted" />
        {trainingSinceLabel(profile.firstTrainedOn, profile.completedSessions)}
      </span>
      <NameSheet open={editing} name={profile.name ?? ""} canEdit={canEdit} onClose={() => setEditing(false)} />
    </section>
  );
}

function NameSheet({ open, name, canEdit, onClose }: { open: boolean; name: string; canEdit: boolean; onClose: () => void }) {
  const shell = useAppShell();
  const update = useUpdateProfile();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProfileNameValues>({ resolver: zodResolver(profileNameSchema), mode: "onTouched", defaultValues: { name } });

  // Ao abrir: limpa o erro (durante a renderização) e recarrega o nome atual no formulário.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setError(null);
  }
  useEffect(() => {
    if (open) reset({ name });
  }, [open, name, reset]);

  const length = useWatch({ control, name: "name" }).length;

  const onSubmit = handleSubmit(({ name: next }) => {
    if (!canEdit) return setError("Sem conexão. Para alterar seu perfil, conecte-se à internet.");
    setError(null);
    update.mutate(
      { name: next },
      {
        onSuccess: () => {
          shell.showToast("Nome atualizado", { tone: "success" });
          onClose();
        },
        onError: (e) => setError(e.message),
      },
    );
  });

  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title="Editar nome">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Banner tone="danger">{error}</Banner>}
        <TextField
          label="Nome"
          autoComplete="name"
          maxLength={NAME_MAX_LENGTH}
          hint={`${length}/${NAME_MAX_LENGTH}`}
          error={errors.name?.message}
          {...register("name")}
        />
        <Button type="submit" size="lg" fullWidth loading={update.isPending} disabled={update.isPending}>
          Salvar
        </Button>
      </form>
    </BottomSheet>
  );
}
