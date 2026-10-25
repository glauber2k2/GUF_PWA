"use client";

import Link from "next/link";
import { ChevronRight, FileText, Scale, Shield } from "lucide-react";
import { Icon } from "@/shared/components/ds";
import { LegalDocLink } from "@/features/legal";
import { useSignupDocuments } from "@/features/auth";
import { cn } from "@/shared/helpers/class-names";
import { ProfileSection } from "./profile-ui";

const ROW = "flex min-h-[52px] items-center gap-3 rounded-md px-2 text-[15px] font-medium text-fg no-underline hover:bg-surface-3";

/** Documentos legais: a central (todas as versões) e o leitor dos Termos e da Política no app. */
export function LegalDocumentsSection() {
  const docs = useSignupDocuments();
  return (
    <ProfileSection id="pf-legal" title="Documentos legais">
      <div className="flex flex-col px-2 py-1.5">
        <Link href="/documentos" className={ROW}>
          <Icon icon={Scale} size={18} className="text-fg-secondary" />
          <span className="flex-1">Central de documentos</span>
          <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
        </Link>
        <LegalDocLink docType="terms" url={docs.data?.terms.url} className={cn(ROW, "border-t border-border font-normal")}>
          <Icon icon={FileText} size={18} className="text-fg-secondary" />
          <span className="flex-1">Termos de Uso</span>
          <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
        </LegalDocLink>
        <LegalDocLink docType="privacy" url={docs.data?.privacy.url} className={cn(ROW, "border-t border-border font-normal")}>
          <Icon icon={Shield} size={18} className="text-fg-secondary" />
          <span className="flex-1">Política de Privacidade</span>
          <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
        </LegalDocLink>
      </div>
    </ProfileSection>
  );
}
