/** Título e apoio de cada passo do cadastro. */
export function SetupStepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em]">{title}</h1>
      <p className="m-0 text-[15px] leading-[22px] text-pretty text-fg-secondary">{subtitle}</p>
    </div>
  );
}
