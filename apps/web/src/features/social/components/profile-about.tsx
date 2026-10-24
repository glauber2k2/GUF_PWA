import { EXPERIENCE_LEVEL_LABELS, TRAINING_GOAL_LABELS } from "@guf/core";
import type { MemberProfile } from "@guf/api";
import { Tag } from "@/shared/components/ds";
import { TRAINING_GOAL_ICONS } from "@/features/social/constants/training-goal-icons";

/** Bio (cartão, todos veem) e objetivos + experiência (só quem pode ver os treinos: o banco já filtra). */
export function ProfileAbout({ profile }: { profile: MemberProfile }) {
  const hasTags = profile.trainingGoals.length > 0 || profile.experienceLevel !== null;
  if (!profile.bio && !hasTags) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {profile.bio && <p className="m-0 text-[15px] leading-[22px] whitespace-pre-line text-fg-secondary [overflow-wrap:anywhere]">{profile.bio}</p>}
      {hasTags && (
        <ul aria-label="Objetivos e experiência" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {profile.experienceLevel && (
            <li>
              <Tag size="sm">{EXPERIENCE_LEVEL_LABELS[profile.experienceLevel]}</Tag>
            </li>
          )}
          {profile.trainingGoals.map((goal) => (
            <li key={goal}>
              <Tag size="sm" icon={TRAINING_GOAL_ICONS[goal]}>
                {TRAINING_GOAL_LABELS[goal]}
              </Tag>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
