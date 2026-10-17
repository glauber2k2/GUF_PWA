# Registro de Incidentes de Segurança — Guf App

**Base**: Resolução CD/ANPD nº 15/2024, Art. 10 — registrar **todos** os incidentes com dados pessoais, comunicados ou não, e guardar cada registro por **no mínimo 5 anos**.
**Iniciado em**: 2026-10-17 · **Procedimento**: [`runbook.md`](./runbook.md)

> Não apague entradas. Correções entram como complemento com data. Não cole aqui dados pessoais dos titulares (e-mails, nomes, medidas): use contagens e ids internos, e guarde evidências sensíveis fora do repositório, registrando onde estão.

## Situação

Nenhum incidente registrado até 2026-10-17.

---

## Modelo (copie para cada incidente)

```markdown
## INC-AAAA-NNN — <título curto>

- **Severidade**: S1 | S2 | S3 | S4
- **Ocorrência (início estimado)**: AAAA-MM-DDTHH:MM-03:00
- **Detecção**: AAAA-MM-DDTHH:MM-03:00 — por <quem/como>
- **Conhecimento de afetação a dados pessoais (marco do prazo)**: AAAA-MM-DDTHH:MM-03:00
- **Prazo de comunicação**: AAAA-MM-DD (3 dias úteis do marco)
- **Descrição**: <o que aconteceu>
- **Componentes**: Supabase | Vercel | Google | GitHub | app | outro
- **Dados afetados**: <categorias e tabelas>
- **Titulares afetados**: <N> (crianças/adolescentes: <N>; idosos: <N>) · **Total na atividade**: <N>
- **Janela de exposição**: <início> a <fim> · **Acesso efetivo?** sim | não | desconhecido
- **Teste Art. 5º Res. 15/2024**:
  - A. Risco relevante: sim | não — <justificativa>
  - B. Categoria: I | II | III | IV | V | VI | nenhuma — <qual>
- **Decisão**: comunicar | não comunicar — <motivo> · decidido por <quem> em <data>
- **Comunicação ANPD**: <data/hora> · protocolo <nº> | N/A
- **Comunicação aos titulares**: <data/hora, meio> | N/A
- **Complemento ANPD (até 20 dias úteis)**: <data> | N/A
- **Contenção**: <ações e horários>
- **Evidências**: <onde estão guardadas> · eliminadas em <data>
- **Causa raiz**: <5 porquês>
- **Correções**: <migration/commit/PR> · prazo <data> · responsável <quem>
- **Lições aprendidas / mudanças no runbook**: <…>
- **Guardar este registro até**: <data do marco + 5 anos>
```
