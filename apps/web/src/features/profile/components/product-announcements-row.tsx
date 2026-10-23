"use client";

import { Megaphone } from "lucide-react";
import type { ProfileUpdate } from "@guf/api";
import { Switch } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { RowGroup, RowIcon } from "./profile-ui";

interface ProductAnnouncementsRowProps {
  /** A pessoa recusou comunicados de produto (profiles.product_announcements_opt_out). */
  optedOut: boolean;
  locked: boolean;
  onSave: (input: ProfileUpdate, done: string) => void;
}

/**
 * Configurações › Preferências: receber ou não as novidades do guf no app (comunicados de produto,
 * LGPD Art. 10, § 2º — gap G24). Avisos de serviço e de documentos continuam chegando.
 */
export function ProductAnnouncementsRow({ optedOut, locked, onSave }: ProductAnnouncementsRowProps) {
  return (
    <RowGroup padded className={cn("flex flex-col gap-2.5", locked && "pointer-events-none opacity-50")}>
      <div aria-disabled={locked || undefined} className="flex items-center gap-3">
        <RowIcon icon={Megaphone} />
        <Switch
          label="Novidades do guf no app"
          checked={!optedOut}
          disabled={locked}
          onChange={(on) =>
            onSave({ productAnnouncementsOptOut: !on }, on ? "Você vai receber as novidades do guf" : "Você não vai mais receber novidades do guf")
          }
          className="flex-1 leading-5 font-semibold"
        />
      </div>
      <span className="text-[13px] leading-[18px] text-pretty text-fg-muted min-[360px]:pl-12">
        Avisos sobre recursos novos. Avisos sobre o serviço (manutenção, sua conta) e sobre os documentos continuam chegando.
      </span>
    </RowGroup>
  );
}
