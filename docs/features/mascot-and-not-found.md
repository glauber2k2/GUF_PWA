# Mascote (GufRat) e página 404

> Detalhes de implementação que saíram do `CLAUDE.md` (índice em "Funcionalidades: onde ler os detalhes").
> Ler inteiro antes de mexer nesta funcionalidade e atualizar no mesmo PR quando o código mudar.

## Mascote (GufRat)
- `shared/components/ds/guf-rat.tsx` (Claude Design "Guf Rat Forte v2"): `<GufRat occasion="workoutDone" animated badge size />`, 34 ocasiões (`GUF_RAT_SPECS`, grupos em `GUF_RAT_GROUPS`; as 4 do grupo "Comparações de peso" — `liftLight`, `lift`, `liftHeavy`, `liftImpossible` — vêm do canvas Comparacoes de Peso). Animações = keyframes `guf-rat-*` (base.css); origem/duração por parte vêm dos dados da pose (estilo inline). Rato sempre branco; contorno no tema claro e braço da frente por tokens `--rat-*` (colors.css), então funciona dentro de seções com outro `data-theme`. Movimento reduzido: parado. Vitrine: `/design-system#mascote`.


## Página 404
- `src/app/not-found.tsx` → `NotFoundScreen` (`features/not-found/`), exportada como `out/404.html`. Logado → "Voltar ao início" (/); sem sessão → "Ir para o login". Redireciona sozinha em 10 s (conta só depois de saber se há sessão); "Ficar aqui" pausa. Animação do anel com keyframes `guf-404-*` (base.css), parada em movimento reduzido.
