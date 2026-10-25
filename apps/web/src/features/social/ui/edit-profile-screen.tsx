"use client";

import { useState, type ReactNode } from "react";
import { Controller } from "react-hook-form";
import { ChevronLeft, CircleCheck, LoaderCircle, Lock, Mail, Pencil, type LucideIcon } from "lucide-react";
import {
  BIO_MAX_LENGTH,
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
  TRAINING_GOAL_LABELS,
  TRAINING_GOALS,
  unsavedChangesMessage,
  type ExperienceLevel,
} from "@guf/core";
import type { ApiError } from "@guf/api";
import { Banner, Chip, ConfirmDialog, Icon, IconButton, SegmentedControl, Skeleton, TextAreaField, TextField } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { useCanEditProfile, useProfile } from "@/features/profile";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { cn } from "@/shared/helpers/class-names";
import { useCanUseSocial, useMySocial } from "@/features/social/api/use-social";
import { ProfilePhotoOrb } from "@/features/social/components/profile-photo-orb";
import { ProfilePhotoSheet } from "@/features/social/components/profile-photo-sheet";
import { AvatarCropDialog } from "@/features/social/components/avatar-crop-dialog";
import { EditProfileSaveBar } from "@/features/social/components/edit-profile-save-bar";
import { TRAINING_GOAL_ICONS } from "@/features/social/constants/training-goal-icons";
import { useEditProfileForm, type EditProfileInitial } from "@/features/social/hooks/use-edit-profile-form";
import { useAvatarChange } from "@/features/social/hooks/use-avatar-change";
import { useHeroCollapse } from "@/features/social/hooks/use-hero-collapse";
import { useRingPhase, type RingPhase } from "@/features/social/hooks/use-ring-phase";
import type { HandleAvailability } from "@/features/social/hooks/use-handle-availability";

const SOCIAL_PROFILE_PATH = "/perfil";
/** Foto aberta e recolhida (px). */
const ORB_OPEN_PX = 124;
const ORB_COLLAPSE_PX = 52;
const HANDLE_RULE_HINT = "3 a 20 caracteres: letras minúsculas, números, ponto ou _";
const LEVEL_OPTIONS = EXPERIENCE_LEVELS.map((level) => ({ value: level, label: EXPERIENCE_LEVEL_LABELS[level] }));

const HANDLE_HINTS: Partial<Record<HandleAvailability, string>> = {
  checking: "Verificando disponibilidade…",
  available: "Disponível",
};

interface PhotoStatus {
  text: string;
  icon: LucideIcon;
  className: string;
}

/** Linha abaixo do nome: o que está acontecendo com o perfil (a foto e os campos gravam o mesmo perfil). */
function photoStatus(phase: RingPhase, isSaving: boolean): PhotoStatus {
  if (phase === "fill") return { text: isSaving ? "Salvando perfil…" : "Enviando foto…", icon: LoaderCircle, className: "text-fg-secondary" };
  if (phase === "done") return { text: "Perfil atualizado", icon: CircleCheck, className: "text-accent-text" };
  return { text: "Alterar perfil", icon: Pencil, className: "text-accent-text" };
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="m-0 px-1 text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">
      {children}
    </h2>
  );
}

function EditProfileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 px-4 pt-5">
      <Skeleton className="size-[124px] rounded-pill" />
      <Skeleton className="h-6 w-40 rounded-md" />
      <Skeleton className="h-[300px] w-full rounded-lg" />
      <Skeleton className="h-[160px] w-full rounded-lg" />
    </div>
  );
}

/**
 * Editar perfil (protótipo Claude Design "Editar Perfil", tela imersiva /perfil/editar).
 * Nome, @, bio, objetivos e experiência gravam juntos em "Salvar"; a foto grava na hora.
 */
export function EditProfileScreen() {
  const profile = useProfile();
  const social = useMySocial();
  const goBack = useGoBack(SOCIAL_PROFILE_PATH);

  if (profile.isPending || social.isPending) {
    return (
      <EditProfileFrame onBack={goBack} isScrolled={false}>
        <EditProfileSkeleton />
      </EditProfileFrame>
    );
  }
  if (!profile.data || !social.data) {
    const error = (profile.error ?? social.error) as ApiError | null;
    return (
      <EditProfileFrame onBack={goBack} isScrolled={false}>
        <div className="px-4 pt-4">
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void Promise.all([profile.refetch(), social.refetch()])}>
            {error?.message ?? "Não foi possível carregar seu perfil. Verifique a internet e tente de novo."}
          </Banner>
        </div>
      </EditProfileFrame>
    );
  }

  const initial: EditProfileInitial = {
    userId: social.data.userId,
    name: profile.data.name ?? "",
    handle: social.data.handle,
    bio: profile.data.bio ?? "",
    trainingGoals: profile.data.trainingGoals,
    experienceLevel: profile.data.experienceLevel,
  };
  return (
    <EditProfileForm
      initial={initial}
      email={profile.data.email}
      avatarUrl={profile.data.avatarUrl}
      hasUploadedPhoto={profile.data.hasUploadedPhoto}
      onBack={goBack}
    />
  );
}

function EditProfileFrame({
  onBack,
  isScrolled,
  children,
}: {
  onBack: () => void;
  isScrolled: boolean;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col pb-[calc(140px+env(safe-area-inset-bottom))]">
      <header
        className={cn(
          "sticky top-0 z-[6] grid grid-cols-[52px_1fr_52px] items-center border-b bg-background/90 px-1.5 pt-[env(safe-area-inset-top)] backdrop-blur-[12px] transition-colors duration-[250ms] ease-standard",
          isScrolled ? "border-border" : "border-transparent",
        )}
      >
        <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={onBack} />
        <h1 className="m-0 flex h-14 items-center justify-center text-[17px] leading-[22px] font-semibold tracking-[-0.01em]">Editar perfil</h1>
        <span />
      </header>
      {children}
    </main>
  );
}

function EditProfileForm({
  initial,
  email,
  avatarUrl,
  hasUploadedPhoto,
  onBack,
}: {
  initial: EditProfileInitial;
  email: string | null;
  avatarUrl: string | null;
  hasUploadedPhoto: boolean;
  onBack: () => void;
}) {
  const { showToast } = useAppShell();
  const canEditProfile = useCanEditProfile();
  const canUseSocial = useCanUseSocial();
  const canEdit = canEditProfile && canUseSocial;
  const ring = useRingPhase();
  const hero = useHeroCollapse();
  const photo = useAvatarChange(ring.run);
  const { inputRef: photoInputRef, pick: pickPhoto, onFile: onPhotoFile, removePhoto, changed: changedPhoto, isBusy: isPhotoBusy } = photo;
  const { form, values, availability, changes, canSave, discard, save } = useEditProfileForm(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const { errors } = form.formState;
  const isDirty = changes > 0;

  const shownAvatar = changedPhoto ? changedPhoto.url : avatarUrl;
  const canRemovePhoto = changedPhoto ? changedPhoto.isUploaded : hasUploadedPhoto;
  const p = hero.progress;
  const orbSize = Math.round(ORB_OPEN_PX - (ORB_OPEN_PX - ORB_COLLAPSE_PX) * p);
  const displayName = values.name?.trim() || "Seu nome";
  const status = photoStatus(ring.phase, isSaving);
  const handleError = errors.handle?.message ?? (availability === "taken" ? "Esse nome de usuário já está em uso. Tente outro." : undefined);

  const requestBack = () => (isDirty ? setLeaveOpen(true) : onBack());

  const submit = async () => {
    if (!canEdit) return showToast("Sem conexão", { tone: "warning", message: "Para editar seu perfil, conecte-se à internet." });
    (document.activeElement as HTMLElement | null)?.blur();
    hero.stopEditing();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsSaving(true);
    try {
      const ok = await ring.run(save);
      if (ok) showToast("Perfil atualizado", { tone: "success", haptic: false });
    } catch (e) {
      showToast("Perfil não salvo", { tone: "error", message: (e as ApiError).message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EditProfileFrame onBack={requestBack} isScrolled={hero.isScrolled}>
      <div className="flex flex-col px-4">
        {!canEdit && (
          <Banner tone="warning" title="Sem conexão" className="mt-3">
            para alterar seu perfil, conecte-se à internet.
          </Banner>
        )}

        <section
          aria-label="Foto de perfil"
          className="flex flex-col items-center gap-3 transition-[padding] duration-[380ms] ease-standard"
          // Área da foto recolhe com a rolagem ou o teclado (valores contínuos).
          style={{ paddingTop: Math.round(20 - 8 * p), paddingBottom: Math.round(28 - 12 * p) }}
        >
          <button
            type="button"
            aria-label="Alterar foto de perfil"
            disabled={!canEdit || isPhotoBusy}
            onClick={() => setSheetOpen(true)}
            className="relative cursor-pointer rounded-pill bg-transparent p-0 text-fg transition-[width,height,scale] duration-[380ms] ease-standard [-webkit-tap-highlight-color:transparent] active:scale-[.96] disabled:cursor-not-allowed"
            style={{ width: orbSize, height: orbSize }}
          >
            <ProfilePhotoOrb src={shownAvatar} name={displayName} phase={ring.phase} progress={p} sizePx={orbSize} />
            <span
              className="absolute grid size-[34px] place-items-center rounded-pill border-[3px] border-background bg-accent text-accent-foreground transition-[scale,right,bottom] duration-[380ms] ease-overshoot"
              style={{ right: Math.round(2 - 4 * p), bottom: Math.round(2 - 4 * p), scale: 1 - p * 0.25 }}
            >
              <Icon icon={Pencil} size={15} />
            </span>
          </button>
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-[380ms] ease-standard",
              p > 0.5 ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
            )}
          >
            <div className="flex flex-col items-center gap-0.5 overflow-hidden">
              <strong className="text-center text-xl leading-[26px] font-bold tracking-[-0.01em]">{displayName}</strong>
              <span aria-live="polite" className={cn("flex items-center gap-1.5 text-[13px] leading-[18px] font-medium transition-colors", status.className)}>
                <Icon icon={status.icon} size={14} className={cn(ring.phase === "fill" && "animate-spin motion-reduce:animate-none")} />
                {status.text}
              </span>
            </div>
          </div>
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void onPhotoFile(e)} className="hidden" />
        </section>

        <form noValidate onSubmit={(e) => e.preventDefault()} {...hero.formHandlers} className="flex flex-col gap-7">
          <section aria-labelledby="ep-public" className="flex animate-guf-rise flex-col gap-2.5">
            <SectionTitle id="ep-public">Perfil público</SectionTitle>
            <div className="flex flex-col gap-[18px] rounded-lg border border-border bg-surface p-4">
              <TextField label="Nome" autoComplete="name" hint="Aparece no seu perfil e no ranking." error={errors.name?.message} {...form.register("name")} />
              <TextField
                label="Nome de usuário"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                hint={HANDLE_HINTS[availability] ?? HANDLE_RULE_HINT}
                error={handleError}
                {...form.register("handle")}
              />
              <TextAreaField
                label="Bio"
                rows={3}
                maxLength={BIO_MAX_LENGTH}
                placeholder="Conte um pouco do seu treino"
                hint={`${values.bio?.length ?? 0}/${BIO_MAX_LENGTH}`}
                error={errors.bio?.message}
                {...form.register("bio")}
              />
            </div>
          </section>

          <section aria-labelledby="ep-training" className="flex animate-guf-rise flex-col gap-2.5 [animation-delay:80ms]">
            <SectionTitle id="ep-training">Seu treino</SectionTitle>
            <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-4">
              <Controller
                control={form.control}
                name="trainingGoals"
                render={({ field }) => (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[13px] font-medium text-fg-secondary">Objetivos</span>
                    <div role="group" aria-label="Objetivos" className="flex flex-wrap gap-2">
                      {TRAINING_GOALS.map((goal) => (
                        <Chip
                          key={goal}
                          label={TRAINING_GOAL_LABELS[goal]}
                          icon={TRAINING_GOAL_ICONS[goal]}
                          selected={field.value.includes(goal)}
                          onChange={(on) => field.onChange(on ? [...field.value, goal] : field.value.filter((g) => g !== goal))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name="experienceLevel"
                render={({ field }) => (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[13px] font-medium text-fg-secondary">Experiência</span>
                    <SegmentedControl
                      label="Experiência"
                      options={LEVEL_OPTIONS}
                      value={field.value ?? ""}
                      onChange={(value) => field.onChange(value as ExperienceLevel)}
                    />
                  </div>
                )}
              />
              <p className="m-0 text-xs leading-4 text-fg-muted">Objetivos e experiência aparecem só para quem pode ver seus treinos.</p>
            </div>
          </section>

          <section aria-labelledby="ep-private" className="flex animate-guf-rise flex-col gap-2.5 [animation-delay:160ms]">
            <SectionTitle id="ep-private">Só você vê</SectionTitle>
            <div className="flex items-center gap-3.5 rounded-lg border border-border bg-surface px-4 py-3.5">
              <span className="grid size-9 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
                <Icon icon={Mail} size={18} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <strong className="truncate text-[15px] leading-5">{email ?? "Sem e-mail"}</strong>
                <span className="text-[13px] leading-[18px] text-fg-secondary">Usado para entrar. Não aparece no perfil.</span>
              </span>
              <Icon icon={Lock} size={16} label="Não editável aqui" className="text-fg-muted" />
            </div>
          </section>
        </form>
      </div>

      <EditProfileSaveBar
        visible={isDirty || isSaving}
        changes={changes}
        saving={isSaving}
        canSave={canSave && canEdit}
        onDiscard={discard}
        onSave={() => void submit()}
      />

      {photo.cropSource && (
        <AvatarCropDialog src={photo.cropSource} isSaving={photo.isPreparing} onCancel={photo.cancelCrop} onConfirm={(crop) => void photo.confirmCrop(crop)} />
      )}

      <ProfilePhotoSheet
        open={sheetOpen}
        canRemove={canRemovePhoto}
        onClose={() => setSheetOpen(false)}
        onPick={pickPhoto}
        onRemove={() => void removePhoto()}
      />

      <ConfirmDialog
        placement="screen"
        open={leaveOpen}
        title="Descartar alterações?"
        message={unsavedChangesMessage(changes)}
        cancelLabel="Continuar editando"
        confirmLabel="Descartar"
        destructive
        onCancel={() => setLeaveOpen(false)}
        onConfirm={onBack}
      />
    </EditProfileFrame>
  );
}
