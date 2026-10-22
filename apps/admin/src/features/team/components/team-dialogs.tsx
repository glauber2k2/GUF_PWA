"use client";

import { useState } from "react";
import { Send, UserX } from "lucide-react";
import type { StaffRow } from "@guf/api/admin";
import { STAFF_ROLES, type StaffRole } from "@guf/core";
import { staffInviteSchema } from "@guf/schemas";
import { Banner, Button, TextField } from "@guf/ui";
import { useInviteStaff, useSetStaffDisabled, useSetStaffRole } from "@/features/team/api/use-team";
import { ROLE_ICONS } from "@/shared/components/badges";
import { ChoiceCard } from "@/shared/components/choice-card";
import { Dialog, DialogActions } from "@/shared/components/dialog";
import { STAFF_EMAIL_DOMAIN } from "@/shared/helpers/environment";

interface DoneProps {
  onClose: () => void;
  onDone: (message: string) => void;
}

function RolePicker({ value, onChange }: { value: StaffRole; onChange: (role: StaffRole) => void }) {
  return (
    <div role="radiogroup" aria-label="Papel" className="flex flex-col gap-2">
      {(Object.keys(STAFF_ROLES) as StaffRole[]).map((role) => (
        <ChoiceCard
          key={role}
          selected={value === role}
          onSelect={() => onChange(role)}
          icon={ROLE_ICONS[role]}
          title={STAFF_ROLES[role].label}
          description={STAFF_ROLES[role].description}
        />
      ))}
    </div>
  );
}

/** 11d · Convidar: e-mail da equipe, nome e papel. O link vale 48 h; no 1º acesso, o segundo fator. */
export function InviteDialog({ onClose, onDone }: DoneProps) {
  const invite = useInviteStaff();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<StaffRole>("support");
  const [tried, setTried] = useState(false);
  const parsed = staffInviteSchema(STAFF_EMAIL_DOMAIN).safeParse({ email, displayName, role });
  const fieldError = (field: string) => (tried && !parsed.success ? parsed.error.issues.find((i) => i.path[0] === field)?.message : undefined);

  const send = () => {
    setTried(true);
    if (!parsed.success) return;
    invite.mutate(parsed.data, {
      onSuccess: () => {
        onDone(`Convite enviado para ${parsed.data.email}`);
        onClose();
      },
    });
  };

  return (
    <Dialog open title="Convidar colaborador" onClose={onClose}>
      <TextField label="E-mail da equipe" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError("email")} />
      <TextField label="Nome" value={displayName} onChange={(e) => setDisplayName(e.target.value)} error={fieldError("displayName")} hint="Aparece na auditoria." />
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-[13px] font-semibold text-fg-secondary">Papel</legend>
        <RolePicker value={role} onChange={setRole} />
      </fieldset>
      <span className="text-[13px] text-fg-secondary">
        Use uma conta só de trabalho (não a conta pessoal de treino). O link vale por 48 horas. No primeiro acesso, a pessoa cria a senha e configura o
        segundo fator.
      </span>
      {invite.error && <Banner tone="danger">{invite.error.message}</Banner>}
      <DialogActions>
        <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
          Cancelar
        </Button>
        <Button size="tall" icon={Send} fullWidth loading={invite.isPending} onClick={send}>
          Enviar convite
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** 11f · Mudar papel (vale no próximo acesso a cada função; o banco lê o papel a cada chamada). */
export function RoleDialog({ member, onClose, onDone }: DoneProps & { member: StaffRow }) {
  const setRole = useSetStaffRole();
  const [role, setRoleValue] = useState<StaffRole>(member.role);
  const save = () =>
    setRole.mutate(
      { userId: member.userId, role },
      {
        onSuccess: () => {
          onDone(`Papel de ${member.displayName} mudou para ${STAFF_ROLES[role].label}`);
          onClose();
        },
      },
    );
  return (
    <Dialog open title={`Mudar papel de ${member.displayName}`} onClose={onClose}>
      <RolePicker value={role} onChange={setRoleValue} />
      <span className="text-[13px] text-fg-secondary">Vale na hora. A mudança fica na auditoria.</span>
      {setRole.error && <Banner tone="danger">{setRole.error.message}</Banner>}
      <DialogActions>
        <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
          Cancelar
        </Button>
        <Button size="tall" fullWidth disabled={role === member.role} loading={setRole.isPending} onClick={save}>
          Salvar papel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** 11e · Desativar (perde o acesso na hora; ações antigas continuam na auditoria) ou reativar. */
export function DisableDialog({ member, onClose, onDone }: DoneProps & { member: StaffRow }) {
  const setDisabled = useSetStaffDisabled();
  const disabling = member.status !== "disabled";
  const firstName = member.displayName.split(" ")[0];
  const confirm = () =>
    setDisabled.mutate(
      { userId: member.userId, disabled: disabling },
      {
        onSuccess: () => {
          onDone(disabling ? `${member.displayName} foi desativado` : `${member.displayName} foi reativado`);
          onClose();
        },
      },
    );
  return (
    <Dialog open title={disabling ? `Desativar ${member.displayName}?` : `Reativar ${member.displayName}?`} onClose={onClose}>
      <p className="m-0 text-pretty text-fg-secondary">
        {disabling
          ? `${firstName} perde o acesso ao painel na hora. As ações já feitas continuam na auditoria. Dá para reativar depois.`
          : `${firstName} volta a entrar no painel com o papel ${STAFF_ROLES[member.role].label}.`}
      </p>
      {setDisabled.error && <Banner tone="danger">{setDisabled.error.message}</Banner>}
      <DialogActions>
        <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={disabling ? "danger" : "primary"} size="tall" icon={disabling ? UserX : undefined} fullWidth loading={setDisabled.isPending} onClick={confirm}>
          {disabling ? "Desativar" : "Reativar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
