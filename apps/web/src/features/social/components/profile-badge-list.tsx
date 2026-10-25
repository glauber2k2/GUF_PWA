import { Tag } from "@/shared/components/ds";
import type { ProfileBadge } from "@/features/social/helpers/profile-badges";

/** Selos do perfil, todos no mesmo padrão (tamanho, cor, ícone e espaçamento). */
export function ProfileBadgeList({ badges, label }: { badges: ProfileBadge[]; label: string }) {
  return (
    <ul aria-label={label} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {badges.map((badge) => (
        <li key={badge.key}>
          <Tag size="sm" icon={badge.icon}>
            {badge.label}
          </Tag>
        </li>
      ))}
    </ul>
  );
}
