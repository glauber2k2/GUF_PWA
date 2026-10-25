import type { MemberProfile } from "@guf/api";
import { ProfileBadgeList } from "@/features/social/components/profile-badge-list";
import { buildProfileBadges } from "@/features/social/helpers/profile-badges";

/** Bio (cartão, todos veem) e objetivos + experiência (só quem pode ver os treinos: o banco já filtra). */
export function ProfileAbout({ profile }: { profile: MemberProfile }) {
  const badges = buildProfileBadges(profile);
  if (!profile.bio && badges.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {profile.bio && <p className="m-0 text-[15px] leading-[22px] whitespace-pre-line text-fg-secondary [overflow-wrap:anywhere]">{profile.bio}</p>}
      {badges.length > 0 && <ProfileBadgeList badges={badges} label="Objetivos e experiência" />}
    </div>
  );
}
