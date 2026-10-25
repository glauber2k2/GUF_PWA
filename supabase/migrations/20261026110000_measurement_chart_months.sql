-- =====================================================================
-- GUF APP · Planos: período dos gráficos de medidas corporais.
-- Documento: docs/plans-and-access.md
--
-- Nova funcionalidade "measurement_chart_months" (limite em meses, contando de hoje para trás):
-- plano padrão (Free) = 3 meses; os outros planos = sem limite. Como nos gráficos de treino, os
-- registros das medidas continuam completos em qualquer plano: o plano limita só o período que o
-- gráfico desenha, e o app abre a tela do Pro quando a pessoa escolhe um período maior ("deixar tentar").
-- =====================================================================

insert into public.features (code, kind, description) values
  ('measurement_chart_months', 'limit', 'Meses mostrados nos gráficos de medidas corporais, contando de hoje para trás');

insert into public.plan_features (plan_code, feature_code, limit_value)
select p.code, 'measurement_chart_months', case when p.is_default then 3 end
  from public.plans p;
