"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { STAFF_ROLES } from "@guf/core";
import { Avatar, IconButton } from "@guf/ui";
import { AUTH_PATHS, useSignOut, useStaff } from "@/features/auth";

/** Quem está no painel + Sair (rodapé da barra lateral e da gaveta). */
export function MeCard({ showRole = false }: { showRole?: boolean }) {
  const { staff } = useStaff();
  const router = useRouter();
  const signOut = useSignOut();

  const leave = async () => {
    await signOut();
    router.replace(AUTH_PATHS.login);
  };

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
      <Avatar name={staff.displayName} size="sm" tone="accent" />
      <div className="flex min-w-0 flex-1 flex-col">
        <strong className="text-[13px] leading-[18px]">{staff.displayName}</strong>
        <span className="truncate text-xs leading-4 text-fg-muted">{showRole ? STAFF_ROLES[staff.role].label : staff.email}</span>
      </div>
      <IconButton icon={LogOut} label="Sair" variant="ghost" onClick={() => void leave()} />
    </div>
  );
}
