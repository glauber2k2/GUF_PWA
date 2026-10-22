"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { STAFF_ROLES, type StaffRole } from "@guf/core";
import { EmptyState } from "@guf/ui";
import { withDevState } from "@/shared/helpers/dev-state-path";

/** 10e · Área só de admin aberta por outro papel (o banco recusa de qualquer jeito). */
export function AdminOnly({ role }: { role: StaffRole }) {
  const router = useRouter();
  return (
    <div className="grid min-h-[70vh] place-items-center p-6">
      <EmptyState
        icon={Lock}
        title="Esta área é só para administradores"
        message={`Seu papel é ${STAFF_ROLES[role].label}. Para ver auditoria e equipe, peça acesso a uma pessoa admin.`}
        actionLabel="Voltar ao início"
        onAction={() => router.push(withDevState("/"))}
        className="max-w-[460px]"
      />
    </div>
  );
}
