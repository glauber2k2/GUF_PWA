"use client";

import { CalendarDays, Crown } from "lucide-react";
import { formatNumber, nextSeasonNotice, rankLabel, seasonPodiumCaption, seasonWinnerTitle, type SeasonPodium, type SeasonPodiumPlace } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { CompetitorAvatar } from "@/features/competition/components/competitor-avatar";
import { firstName } from "@/features/competition/components/position-card";
import { SEASON_PODIUM_TONE_STYLES, seasonPodiumTone } from "@/features/competition/constants/podium-tones";

function toneOf(place: SeasonPodiumPlace, isWinner: boolean) {
  return SEASON_PODIUM_TONE_STYLES[seasonPodiumTone(place.isMe, isWinner)];
}

/** 2º ou 3º ao lado do campeão: foto pequena e "2º Bia". */
function RunnerUp({ place }: { place: SeasonPodiumPlace | undefined }) {
  if (!place) return <span className="w-10" />;
  return (
    <div className="flex flex-col items-center gap-1 pb-1.5 opacity-90">
      <span className={cn("grid rounded-pill border-2 p-px", toneOf(place, false).ring)}>
        <CompetitorAvatar competitor={place} size="sm" />
      </span>
      <span className="text-[11px] font-semibold text-fg-muted">
        {rankLabel(place.rank)} {firstName(place)}
      </span>
    </div>
  );
}

/** Campeão no centro: foto grande com anel volt e a coroa. */
function Champion({ place }: { place: SeasonPodiumPlace }) {
  return (
    <div className="relative grid place-items-center pt-[26px]">
      <Icon icon={Crown} size={26} className="absolute top-0 text-accent-text" />
      <span className={cn("grid rounded-pill border-[2.5px] p-[3px]", toneOf(place, true).ring)}>
        <CompetitorAvatar competitor={place} size="lg" className="size-[88px] text-4xl" />
      </span>
    </div>
  );
}

/** Degrau de 2º ou 3º com os pontos da temporada. */
function Step({ place, heightClass }: { place: SeasonPodiumPlace | undefined; heightClass: string }) {
  if (!place) return <div />;
  return (
    <div className={cn("grid place-items-center rounded-t-[10px] font-display text-[15px] font-semibold tabular-nums", heightClass, toneOf(place, false).step)}>
      {formatNumber(place.points, 0)}
    </div>
  );
}

function ChampionStep({ place }: { place: SeasonPodiumPlace }) {
  return (
    <div className={cn("flex h-[76px] flex-col items-center justify-center rounded-t-xl", toneOf(place, true).step)}>
      <span className="font-display text-4xl leading-9 font-bold tabular-nums">{formatNumber(place.points, 0)}</span>
      <span className="text-[11px] font-bold tracking-[0.08em] uppercase">pts</span>
    </div>
  );
}

/**
 * Pódio do campeão (Claude Design "Podio Encerrado" · 1c): nos 3 primeiros dias da temporada, o
 * campeão da encerrada em destaque, 2º e 3º recolhidos, degraus com os pontos e o aviso de que a
 * nova temporada já começou. Quem entra e quando vem do servidor.
 */
export function SeasonPodiumCard({ podium }: { podium: SeasonPodium }) {
  const [winner, second, third] = podium.places;
  if (!winner) return null;
  const title = seasonWinnerTitle(winner, podium.season);

  return (
    <section aria-label={`Pódio de ${seasonPodiumCaption(podium.season)}`} className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-e1">
      <div className="flex items-baseline justify-between px-5 pt-5">
        <h2 className="m-0 text-lg leading-6 font-semibold tracking-[-0.015em]">Pódio</h2>
        <span className="text-[13px] text-fg-muted">{seasonPodiumCaption(podium.season)}</span>
      </div>
      <div className="flex flex-col items-center gap-2.5 px-4 pt-4">
        <div className="flex items-end justify-center gap-4">
          <RunnerUp place={second} />
          <Champion place={winner} />
          <RunnerUp place={third} />
        </div>
        <strong className="text-xl leading-[26px] font-bold tracking-[-0.02em]">{title}</strong>
      </div>
      <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] items-end gap-1.5 px-4 pt-4">
        <Step place={second} heightClass="h-9" />
        <ChampionStep place={winner} />
        <Step place={third} heightClass="h-7" />
      </div>
      <ol className="sr-only">
        {podium.places.map((place) => (
          <li key={place.userId}>{`${rankLabel(place.rank)}, ${firstName(place)}, ${formatNumber(place.points, 0)} pontos`}</li>
        ))}
      </ol>
      <div className="flex items-center gap-2.5 border-t border-border px-5 py-3.5 text-[13px] leading-[18px] text-fg-secondary">
        <Icon icon={CalendarDays} size={16} className="flex-none text-accent-text" />
        <span className="flex-1">{nextSeasonNotice(podium.season)}</span>
      </div>
    </section>
  );
}
