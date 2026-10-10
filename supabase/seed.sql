-- =====================================================================
-- GUF APP · Seed
-- 1) Catálogo de exercícios globais (user_id nulo)
-- 2) Documentos legais PROVISÓRIOS, apenas para desenvolvimento
-- =====================================================================

insert into public.exercises (name, muscle_group, equipment) values
  -- PEITO
  ('Supino reto com barra', 'peito', 'barra'),
  ('Supino reto com halteres', 'peito', 'halter'),
  ('Supino inclinado com barra', 'peito', 'barra'),
  ('Supino inclinado com halteres', 'peito', 'halter'),
  ('Supino declinado com barra', 'peito', 'barra'),
  ('Supino reto na máquina', 'peito', 'maquina'),
  ('Supino inclinado no Smith', 'peito', 'smith'),
  ('Crucifixo com halteres', 'peito', 'halter'),
  ('Crucifixo na máquina (peck deck)', 'peito', 'maquina'),
  ('Crossover na polia', 'peito', 'polia'),
  ('Flexão de braço', 'peito', 'peso_corporal'),
  ('Paralelas (foco em peito)', 'peito', 'peso_corporal'),
  -- COSTAS
  ('Barra fixa', 'costas', 'peso_corporal'),
  ('Puxada frontal na polia', 'costas', 'polia'),
  ('Puxada com triângulo', 'costas', 'polia'),
  ('Remada curvada com barra', 'costas', 'barra'),
  ('Remada unilateral com halter', 'costas', 'halter'),
  ('Remada baixa na polia', 'costas', 'polia'),
  ('Remada cavalinho (T-bar)', 'costas', 'barra'),
  ('Remada na máquina', 'costas', 'maquina'),
  ('Pulldown com braços estendidos', 'costas', 'polia'),
  ('Levantamento terra', 'costas', 'barra'),
  ('Hiperextensão lombar', 'costas', 'peso_corporal'),
  -- OMBROS
  ('Desenvolvimento com barra', 'ombros', 'barra'),
  ('Desenvolvimento com halteres', 'ombros', 'halter'),
  ('Desenvolvimento na máquina', 'ombros', 'maquina'),
  ('Elevação lateral com halteres', 'ombros', 'halter'),
  ('Elevação lateral na polia', 'ombros', 'polia'),
  ('Elevação frontal com halteres', 'ombros', 'halter'),
  ('Crucifixo inverso com halteres', 'ombros', 'halter'),
  ('Crucifixo inverso na máquina', 'ombros', 'maquina'),
  ('Face pull na polia', 'ombros', 'polia'),
  ('Remada alta com barra', 'ombros', 'barra'),
  ('Encolhimento com halteres', 'ombros', 'halter'),
  -- BÍCEPS
  ('Rosca direta com barra', 'biceps', 'barra'),
  ('Rosca direta com barra W', 'biceps', 'barra'),
  ('Rosca alternada com halteres', 'biceps', 'halter'),
  ('Rosca martelo', 'biceps', 'halter'),
  ('Rosca concentrada', 'biceps', 'halter'),
  ('Rosca Scott', 'biceps', 'maquina'),
  ('Rosca na polia', 'biceps', 'polia'),
  ('Rosca inclinada com halteres', 'biceps', 'halter'),
  -- TRÍCEPS
  ('Tríceps na polia com barra', 'triceps', 'polia'),
  ('Tríceps na polia com corda', 'triceps', 'polia'),
  ('Tríceps testa com barra W', 'triceps', 'barra'),
  ('Tríceps francês com halter', 'triceps', 'halter'),
  ('Tríceps coice com halter', 'triceps', 'halter'),
  ('Supino fechado', 'triceps', 'barra'),
  ('Mergulho no banco', 'triceps', 'peso_corporal'),
  ('Paralelas (foco em tríceps)', 'triceps', 'peso_corporal'),
  -- ANTEBRAÇO
  ('Rosca de punho', 'antebraco', 'barra'),
  ('Rosca inversa', 'antebraco', 'barra'),
  -- QUADRÍCEPS
  ('Agachamento livre', 'quadriceps', 'barra'),
  ('Agachamento frontal', 'quadriceps', 'barra'),
  ('Agachamento no Smith', 'quadriceps', 'smith'),
  ('Agachamento hack', 'quadriceps', 'maquina'),
  ('Leg press 45°', 'quadriceps', 'maquina'),
  ('Cadeira extensora', 'quadriceps', 'maquina'),
  ('Afundo com halteres', 'quadriceps', 'halter'),
  ('Agachamento búlgaro', 'quadriceps', 'halter'),
  ('Agachamento goblet', 'quadriceps', 'kettlebell'),
  ('Passada (avanço)', 'quadriceps', 'halter'),
  -- POSTERIOR
  ('Stiff com barra', 'posterior', 'barra'),
  ('Levantamento terra romeno', 'posterior', 'barra'),
  ('Mesa flexora', 'posterior', 'maquina'),
  ('Cadeira flexora', 'posterior', 'maquina'),
  ('Flexora em pé', 'posterior', 'maquina'),
  ('Good morning', 'posterior', 'barra'),
  -- GLÚTEOS
  ('Elevação pélvica com barra', 'gluteos', 'barra'),
  ('Elevação pélvica na máquina', 'gluteos', 'maquina'),
  ('Glúteo na polia (coice)', 'gluteos', 'polia'),
  ('Cadeira abdutora', 'gluteos', 'maquina'),
  ('Cadeira adutora', 'gluteos', 'maquina'),
  ('Ponte de glúteo', 'gluteos', 'peso_corporal'),
  -- PANTURRILHA
  ('Panturrilha em pé na máquina', 'panturrilha', 'maquina'),
  ('Panturrilha sentado', 'panturrilha', 'maquina'),
  ('Panturrilha no leg press', 'panturrilha', 'maquina'),
  -- ABDÔMEN
  ('Abdominal supra', 'abdomen', 'peso_corporal'),
  ('Abdominal na polia', 'abdomen', 'polia'),
  ('Abdominal na máquina', 'abdomen', 'maquina'),
  ('Elevação de pernas', 'abdomen', 'peso_corporal'),
  ('Prancha', 'abdomen', 'peso_corporal'),
  ('Abdominal oblíquo', 'abdomen', 'peso_corporal'),
  -- CORPO INTEIRO
  ('Kettlebell swing', 'corpo_inteiro', 'kettlebell'),
  ('Burpee', 'corpo_inteiro', 'peso_corporal'),
  ('Clean (arremesso)', 'corpo_inteiro', 'barra'),
  -- CARDIO
  ('Esteira', 'cardio', 'maquina'),
  ('Bicicleta ergométrica', 'cardio', 'maquina'),
  ('Elíptico', 'cardio', 'maquina'),
  ('Remo ergômetro', 'cardio', 'maquina'),
  ('Pular corda', 'cardio', 'outro');

-- ---------------------------------------------------------------------
-- DOCUMENTOS LEGAIS PROVISÓRIOS (SÓ PARA DESENVOLVIMENTO)
-- Em produção, cadastre as versões revisadas pelo advogado com o hash real do texto.
-- ---------------------------------------------------------------------
insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash) values
  ('terms',           '0.1-dev', '/termos',            'DEV-PLACEHOLDER', null),
  ('privacy',         '0.1-dev', '/privacidade',       'DEV-PLACEHOLDER', null),
  ('age_declaration', '0.1-dev', '/termos#idade',      'DEV-PLACEHOLDER', null),
  ('health_consent',  '0.1-dev', '/termo-de-saude',    'DEV-PLACEHOLDER', 'DEV-PLACEHOLDER');
