/** Círculo da foto do cadastro: a foto entrando do desfoque ou a inicial em volt. */
export function SetupPortrait({ photoUrl, initial, size = "lg" }: { photoUrl: string | null; initial: string; size?: "lg" | "md" }) {
  return (
    <span className="absolute inset-0 grid place-items-center overflow-hidden rounded-pill border border-border bg-accent-tile">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto do Storage ou da conta social; o next/image não se aplica no site estático
        <img key={photoUrl} src={photoUrl} alt="" className="size-full animate-guf-profile-reveal object-cover" />
      ) : (
        <span className={size === "lg" ? "font-display text-[72px] leading-none font-bold text-accent-text" : "font-display text-[64px] leading-none font-bold text-accent-text"}>
          {initial}
        </span>
      )}
    </span>
  );
}
