/**
 * Conteúdo dos documentos legais lidos DENTRO do app (/termos, /privacidade, /termo-de-saude).
 * Puro (sem React): o app web e o futuro app mobile renderizam a mesma estrutura.
 *
 * Versão 1.0 (2026-10-23): textos oficiais do guf mantido por pessoa física, agente de pequeno porte
 * (Res. CD/ANPD nº 2/2022), sem revisão por advogado (decisão do controlador: revisão jurídica depois
 * dos primeiros clientes pagantes; .lgpd/STATUS.md). Escritos a partir do que o sistema faz de
 * verdade: mudou o comportamento, mude o texto (nova versão em legal_documents por migration, hashes
 * de `legal:hashes`). Marcadores "[…]" não podem voltar: o leitor os destaca como pendência.
 */

export const LEGAL_CONTENT_IS_DRAFT = false;

/** Quem responde pelos dados (LGPD, art. 9º, III): pessoa física, sem CPF nem endereço publicados. */
export const CONTROLLER_NAME = "Glauber Monteiro";
export const CONTROLLER_DESCRIPTION = `${CONTROLLER_NAME}, pessoa física, desenvolvedor independente`;

/**
 * Canal de comunicação com o titular (LGPD art. 18; Res. CD/ANPD nº 2/2022, art. 11: agente de pequeno
 * porte sem encarregado mantém um canal). Também é o e-mail de suporte. Mudar o e-mail muda o hash
 * dos documentos: nova versão.
 */
export const PRIVACY_CONTACT_EMAIL = "devglaubermonteiro@gmail.com";
/** Prazo de resposta a pedidos do titular (LGPD, art. 19, II). */
export const DSAR_RESPONSE_DAYS = 15;

/** Documento do leitor (rota do app) ↔ doc_type do banco. */
export type LegalReaderDoc = "termos" | "privacidade" | "saude" | "assinatura";
export type LegalReaderDocType = "terms" | "privacy" | "health_consent" | "subscription_terms";

/** Ícones por nome (o app mapeia para lucide-react). */
export type LegalIcon =
  | "user-check"
  | "stethoscope"
  | "folder-lock"
  | "circle-x"
  | "bell"
  | "dumbbell"
  | "ban"
  | "heart-pulse"
  | "download"
  | "globe"
  | "ruler"
  | "target"
  | "toggle-left"
  | "trash-2"
  | "triangle-alert"
  | "file-text"
  | "shield"
  | "users";

/** Atalhos dentro do texto que levam a Configurações › Privacidade. */
export type LegalAction = "export" | "delete" | "revoke";

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "table"; caption: string; head: string[]; rows: string[][] }
  | { kind: "note"; text: string; icon: LegalIcon }
  | { kind: "link"; doc: LegalReaderDoc; anchor?: string; text: string }
  | { kind: "action"; action: LegalAction };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalSummaryItem {
  icon: LegalIcon;
  text: string;
}

export interface LegalDocumentContent {
  doc: LegalReaderDoc;
  docType: LegalReaderDocType;
  route: string;
  title: string;
  /** Título curto (cabeçalho do leitor). */
  shortTitle: string;
  icon: LegalIcon;
  summary: LegalSummaryItem[];
  sections: LegalSection[];
  /** "O que mudou" por versão (mostrado a quem aceitou uma versão anterior). */
  changes: Record<string, string[]>;
}

export const LEGAL_ACTIONS: Record<LegalAction, { title: string; description: string; danger: boolean }> = {
  export: { title: "Exportar meus dados", description: "Gera um arquivo com sua conta, treinos e medidas.", danger: false },
  delete: {
    title: "Excluir minha conta",
    description: "Apaga conta, treinos, rotinas e medidas. Não pode ser desfeito.",
    danger: true,
  },
  revoke: { title: "Revogar consentimento", description: "Desativa o módulo e apaga todas as medidas.", danger: true },
};

const p = (text: string): LegalBlock => ({ kind: "p", text });
const ul = (...items: string[]): LegalBlock => ({ kind: "ul", items });
const action = (a: LegalAction): LegalBlock => ({ kind: "action", action: a });

const TERMS: LegalDocumentContent = {
  doc: "termos",
  docType: "terms",
  route: "/termos",
  title: "Termos de Uso",
  shortTitle: "Termos de Uso",
  icon: "file-text",
  summary: [
    { icon: "user-check", text: "O guf é para pessoas com 18 anos ou mais." },
    { icon: "stethoscope", text: "O app registra treinos. Não substitui a orientação de médico ou profissional de educação física." },
    { icon: "folder-lock", text: "O que você registra continua sendo seu." },
    { icon: "users", text: "Seu perfil começa privado. Você escolhe quem segue você e se abre o perfil para todos." },
    { icon: "circle-x", text: "Você pode encerrar a conta quando quiser, em Configurações › Privacidade." },
    { icon: "bell", text: "Mudanças importantes são avisadas no app antes de valer." },
  ],
  sections: [
    {
      id: "aceite",
      title: "Aceite",
      blocks: [
        p(
          `Estes Termos de Uso regulam o uso do guf, mantido por ${CONTROLLER_DESCRIPTION}. Contato: ${PRIVACY_CONTACT_EMAIL}. Ao criar uma conta, você declara que leu e aceita estes termos e a Política de Privacidade.`,
        ),
        p(
          "O guf está em fase inicial: funcionalidades podem mudar, melhorar ou sair. Quando uma mudança afetar seus dados ou o seu plano, você é avisado no app antes.",
        ),
      ],
    },
    {
      id: "quem-pode-usar",
      title: "Quem pode usar",
      blocks: [p("O guf pode ser usado por pessoas físicas, para registrar e acompanhar o próprio treino de musculação.")],
    },
    {
      id: "idade",
      title: "Declaração de idade",
      blocks: [
        p("O guf é destinado a pessoas com 18 anos ou mais. Ao marcar “Tenho 18 anos ou mais” no cadastro, você declara ter essa idade."),
        p(
          "A idade é declarada por você e não é verificada por documento. Se for identificado que a conta pertence a menor de 18 anos, ela será encerrada e os dados apagados, conforme a Política de Privacidade.",
        ),
      ],
    },
    {
      id: "conta",
      title: "Sua conta",
      blocks: [
        ul(
          "Use dados verdadeiros e mantenha o e-mail atualizado.",
          "A senha é pessoal. Não a compartilhe.",
          `Se notar um acesso que não foi seu, escreva para ${PRIVACY_CONTACT_EMAIL}.`,
        ),
      ],
    },
    {
      id: "orientacao",
      title: "O guf não substitui orientação profissional",
      blocks: [
        {
          kind: "note",
          icon: "heart-pulse",
          text: "Exercício físico envolve riscos. Antes de começar ou mudar seu treino, consulte um médico e um profissional de educação física.",
        },
        p(
          "O guf registra e organiza o que você treina. Cálculos como o 1RM estimado, gráficos e sugestões são informativos e não são prescrição de treino, diagnóstico ou tratamento.",
        ),
        p("Interrompa o exercício se sentir dor, tontura, falta de ar ou mal-estar."),
      ],
    },
    {
      id: "conteudo",
      title: "Conteúdo do usuário",
      blocks: [
        p(
          "Treinos, rotinas, notas e medidas que você registra são seus. O guf só os usa para prestar o serviço, como descrito na Política de Privacidade.",
        ),
        p("Não é permitido usar o app para enviar conteúdo ilegal, ofensivo ou que viole direitos de terceiros."),
      ],
    },
    {
      id: "perfil-social",
      title: "Perfil, seguidores e competição",
      blocks: [
        p(
          "Toda conta tem um perfil com nome de usuário (@), nome e foto, que aparecem na busca e no link do perfil para que outras pessoas possam seguir você. O @ começa aleatório e pode ser trocado.",
        ),
        p(
          "Em Editar perfil você pode, se quiser, escrever uma bio, que aparece junto com o nome e a foto para qualquer pessoa com conta no guf, e marcar seus objetivos e sua experiência, que aparecem só para quem pode ver seus treinos. Não escreva na bio dados de saúde nem dados de outras pessoas.",
        ),
        p(
          "O perfil começa privado: só seguidores que você aprovar veem sua evolução, sequência e histórico de treinos. Se você abrir o perfil, qualquer pessoa com conta no guf vê esses dados, e seguir não precisa mais de aprovação. Fechar de novo não remove quem já segue você: só quem chegar depois precisa de aprovação.",
        ),
        ul(
          "Você pode ocultar o histórico de treinos a qualquer momento; evolução, sequência e competição continuam visíveis.",
          "No perfil de outra pessoa, o histórico de treinos mostra só os treinos do mês atual, em qualquer plano. O mesmo vale para quem vê o seu perfil.",
          "Você pode remover qualquer seguidor ou bloquear uma pessoa. Bloquear desfaz os vínculos dos dois lados.",
          "Quem vocês se seguem mutuamente compete com você num ranking de pontos calculado a partir dos treinos (constância, recordes de carga e de cardio e volume), pelas mesmas regras para todos, publicadas no app.",
          "Medidas corporais e observações escritas por você nunca aparecem para outras pessoas.",
          "Não há chat nem mensagens entre usuários. Use o perfil com respeito: contas usadas para assediar outras pessoas podem ser encerradas.",
        ),
      ],
    },
    {
      id: "guf-ai",
      title: "GUF AI",
      blocks: [
        p(
          "O GUF AI responde perguntas sobre os seus próprios treinos e ajuda a montar rotinas a partir de uma ficha colada por você. As respostas são geradas por inteligência artificial e podem conter erros.",
        ),
        ul(
          "Confira cargas, séries e exercícios antes de treinar. O GUF AI não é médico nem profissional de educação física e não faz diagnóstico.",
          "Rotinas sugeridas só são criadas depois que você revisa e confirma.",
          "Não escreva nas perguntas nomes, telefones, documentos ou informações de saúde.",
          "O número de perguntas por dia depende do plano.",
        ),
        { kind: "link", doc: "privacidade", anchor: "guf-ai", text: "Ler como o GUF AI usa seus dados" },
      ],
    },
    {
      id: "planos",
      title: "Planos Free e Pro",
      blocks: [
        p(
          "O guf tem um plano gratuito (Free) e um plano pago (Pro). O Free tem limites, como a quantidade de projetos e de rotinas, as perguntas por dia ao GUF AI, o período mostrado nos gráficos e a competição além do mês atual. Seus treinos, recordes e evolução ficam completos em qualquer plano. A comparação atualizada fica na tela Planos, em Configurações.",
        ),
        p(
          "O Pro só é contratado na tela de assinatura. Lá aparecem o preço, a forma de cobrança, a renovação e o cancelamento, e você aceita os Termos da Assinatura antes de qualquer cobrança.",
        ),
        { kind: "link", doc: "assinatura", text: "Ler os Termos da Assinatura" },
        p(
          "Mudar de plano nunca apaga dados. Se o seu plano deixar de incluir algo, o que você já criou continua salvo e pode ser exportado a qualquer momento; só não é possível criar mais além do limite, e os gráficos voltam a mostrar o período do plano.",
        ),
        p("Se os limites de um plano diminuírem, você será avisado no app antes de a mudança valer."),
      ],
    },
    {
      id: "encerramento",
      title: "Encerramento de conta",
      blocks: [
        p("Você pode excluir sua conta a qualquer momento. A exclusão apaga treinos, rotinas, projetos e medidas."),
        action("delete"),
        p("Se estes termos forem violados, a conta pode ser suspensa (por um prazo ou até nova análise) ou excluída:"),
        ul(
          "Sempre que possível, você é avisado antes, no app ou por e-mail, com o motivo.",
          "Em casos graves, como fraude, uso da conta de outra pessoa, assédio ou risco a outras pessoas, a suspensão pode ser imediata.",
          "Durante a suspensão você não consegue entrar, e seus dados continuam guardados.",
          "A exclusão por violação é avisada no app com a data, para você poder exportar seus dados antes, salvo nos casos graves.",
          `Você pode contestar a suspensão ou a exclusão pelo e-mail ${PRIVACY_CONTACT_EMAIL}; a resposta sai em até ${DSAR_RESPONSE_DAYS} dias.`,
        ),
      ],
    },
    {
      id: "responsabilidade",
      title: "Limitação de responsabilidade",
      blocks: [
        p(
          "O guf trabalha para manter o app disponível e seguro, mas não responde por lesões decorrentes da execução dos exercícios, por decisões tomadas a partir de respostas do GUF AI nem por indisponibilidades temporárias, nos limites do Código de Defesa do Consumidor.",
        ),
      ],
    },
    {
      id: "alteracoes",
      title: "Alterações",
      blocks: [p("Quando estes termos mudarem de forma relevante, o app mostra o que mudou e pede seu aceite antes de a nova versão valer.")],
    },
    {
      id: "foro",
      title: "Foro e contato",
      blocks: [p(`Estes termos seguem a lei brasileira. Fica eleito o foro do domicílio do usuário. Dúvidas: ${PRIVACY_CONTACT_EMAIL}.`)],
    },
  ],
  changes: {
    "1.2": ["Competição: recordes de cardio (melhor ritmo ou maior distância) passam a pontuar como os de carga."],
    "1.1": [
      "Editar perfil: bio opcional (visível com o nome e a foto) e objetivos e experiência opcionais (visíveis só para quem pode ver seus treinos).",
    ],
    "1.0": [
      `Versão oficial: o guf é mantido por ${CONTROLLER_DESCRIPTION}, com contato em ${PRIVACY_CONTACT_EMAIL}.`,
      "Suspensão e exclusão por violação: quando há aviso antes, quando pode ser imediata e como contestar.",
      "Nova seção sobre o GUF AI: as respostas podem errar e não substituem um profissional.",
      "O guf está em fase inicial: mudanças que afetem seus dados ou seu plano são avisadas antes.",
    ],
    "0.5-dev": [
      "Seus treinos, recordes e evolução ficam completos em qualquer plano; o Free limita só o período mostrado nos gráficos.",
      "No perfil de outra pessoa, o histórico de treinos mostra só os treinos do mês atual.",
    ],
    "0.4-dev": [
      "Novo: planos Free e Pro. O Free tem limites de projetos, rotinas, perguntas ao GUF AI e período de histórico e de competição.",
      "O Pro é contratado só na tela de assinatura, com preço, renovação e cancelamento informados antes de qualquer cobrança.",
      "Mudar de plano nunca apaga seus dados.",
    ],
    "0.3-dev": [
      "A pontuação da competição passa a ser calculada pela constância, pelos recordes de carga e pelo volume dos treinos.",
      "O esforço do treino (nota de 1 a 10) não é mais pedido nem usado.",
    ],
    "0.2-dev": [
      "Novo: perfil com nome de usuário (@), seguidores e competição entre quem se segue mutuamente.",
      "Seu perfil começa privado. Abrir o perfil deixa sua evolução, sequência e histórico visíveis para qualquer pessoa com conta no guf.",
      "Você pode ocultar o histórico, remover seguidores e bloquear pessoas a qualquer momento.",
    ],
  },
};

const PRIVACY: LegalDocumentContent = {
  doc: "privacidade",
  docType: "privacy",
  route: "/privacidade",
  title: "Política de Privacidade",
  shortTitle: "Política de Privacidade",
  icon: "shield",
  summary: [
    { icon: "dumbbell", text: "Só são coletados os dados necessários para registrar seus treinos e mostrar sua evolução." },
    { icon: "ban", text: "Seus dados não são vendidos nem usados para publicidade." },
    { icon: "heart-pulse", text: "Medidas corporais são opcionais e só são coletadas com o seu consentimento." },
    { icon: "download", text: "Você pode exportar ou apagar seus dados pelo app, em Configurações › Privacidade." },
    { icon: "globe", text: "Seus dados ficam guardados no Brasil. Alguns prestadores ficam nos EUA, e a transferência segue as regras da LGPD." },
    { icon: "user-check", text: `Responsável: ${CONTROLLER_NAME}. Pedidos sobre seus dados: ${PRIVACY_CONTACT_EMAIL}.` },
  ],
  sections: [
    {
      id: "quem-somos",
      title: "Quem somos",
      blocks: [
        p(
          `O guf é mantido por ${CONTROLLER_DESCRIPTION}. Para a LGPD, ele é o controlador dos seus dados pessoais: decide como e para que eles são tratados.`,
        ),
        p(
          `Como agente de tratamento de pequeno porte (Resolução CD/ANPD nº 2/2022), o guf não tem encarregado (DPO) designado, o que a resolução dispensa (art. 11). O canal para dúvidas e pedidos sobre seus dados é o e-mail ${PRIVACY_CONTACT_EMAIL}, que recebe e responde esses pedidos.`,
        ),
      ],
    },
    {
      id: "dados",
      title: "Dados que coletamos",
      blocks: [
        {
          kind: "table",
          caption: "Dados coletados",
          head: ["Dado", "Exemplo", "Origem"],
          rows: [
            ["Conta", "Nome, e-mail e senha criptografada", "Você ou o login com Google"],
            ["Treinos", "Exercícios, séries, cargas, repetições e descanso", "Você"],
            ["Preferências", "Tema, unidade de peso e meta semanal", "Você"],
            ["Foto do perfil", "Imagem enviada (recortada e reduzida no aparelho, sem os dados da câmera, como a localização) ou vinda do Google", "Você, opcional"],
            ["Perfil social", "Nome de usuário (@), seguidores, pedidos e bloqueios", "Você"],
            ["Sobre você no perfil", "Bio, objetivos de treino e experiência", "Você, opcional"],
            ["Avisos no celular", "Endereço do aparelho no serviço de notificações e chaves de criptografia", "Seu aparelho, se você ligar os avisos"],
            [
              "Plano e assinatura",
              "Plano atual, de onde ele vem e até quando vale; se você assinar o Pro, a situação da assinatura e o código dela no prestador de pagamento",
              "O app e, se você assinar, o prestador de pagamento",
            ],
            ["Medidas corporais", "Circunferências do corpo, em centímetros", "Você, opcional e com consentimento"],
            ["Conversas com o GUF AI", "Suas perguntas, as respostas e se você marcou a resposta como útil", "Você, se usar o GUF AI"],
            ["Ficha colada para importar", "O texto da ficha (não é guardado) e o horário da conversão", "Você, se usar a importação"],
            ["Comunicados", "Quais avisos do guf você viu, fechou ou tocou", "O app"],
            ["Atendimento", "Registro do que a equipe viu ou alterou na sua conta, com o motivo; suspensões e exclusões agendadas", "A equipe do guf, ao atender ou moderar"],
          ],
        },
        p("Não são coletados localização, contatos nem dados de outros apps."),
      ],
    },
    {
      id: "finalidade",
      title: "Para que usamos e base legal",
      blocks: [
        {
          kind: "table",
          caption: "Finalidades e bases legais",
          head: ["Finalidade", "Dados", "Base legal"],
          rows: [
            ["Criar e manter sua conta", "Conta", "Execução de contrato (art. 7º, V)"],
            ["Registrar treinos e mostrar evolução", "Treinos e preferências", "Execução de contrato (art. 7º, V)"],
            ["Acompanhar medidas corporais", "Medidas", "Consentimento (art. 11, I)"],
            ["Mostrar seu perfil (@, nome, foto e bio) na busca e receber pedidos para seguir", "Conta, perfil social e bio", "Execução de contrato (art. 7º, V)"],
            ["Mostrar seus objetivos e sua experiência a quem pode ver seus treinos", "Sobre você no perfil", "Execução de contrato (art. 7º, V), pela sua escolha no app"],
            ["Mostrar seus treinos a quem você aprovar (ou a todos, se abrir o perfil) e competir", "Treinos e pontuação", "Execução de contrato (art. 7º, V), pela sua escolha no app"],
            ["Avisar no celular sobre seguidores (novo seguidor, pedido para seguir, pedido aceito) e quando um competidor está perto de passar você ou passa", "Avisos no celular, perfil social e pontuação da competição", "Execução de contrato (art. 7º, V), só se você ligar as notificações"],
            ["Liberar o que o seu plano inclui e gerir a assinatura do Pro", "Plano e assinatura", "Execução de contrato (art. 7º, V)"],
            ["Guardar os registros de pagamento exigidos pela lei fiscal", "Assinatura e pagamentos", "Obrigação legal (art. 7º, II)"],
            ["Responder suas perguntas no GUF AI e converter fichas em rotinas", "Conversas, treinos e rotinas (sem identificação)", "Execução de contrato (art. 7º, V), só se você usar"],
            ["Avisos sobre o serviço e sobre estes documentos", "Comunicados", "Execução de contrato (art. 7º, V) e obrigação legal (art. 7º, II)"],
            ["Avisos de novidades do guf", "Comunicados", "Legítimo interesse (art. 7º, IX), com opção de desligar em Configurações › Preferências"],
            ["Atender pedidos de suporte e aplicar estes termos (suspensão ou exclusão por violação)", "Atendimento e o resumo da conta", "Execução de contrato (art. 7º, V) e exercício regular de direitos (art. 7º, VI)"],
            ["Comprovar seus aceites e consentimentos", "Documento, versão e data de cada aceite", "Obrigação legal (art. 7º, II)"],
            ["Segurança e prevenção a fraudes", "Conta e registros de acesso", "Legítimo interesse (art. 7º, IX)"],
            ["Cumprir obrigações legais", "Registros de acesso", "Obrigação legal (art. 7º, II)"],
          ],
        },
      ],
    },
    {
      id: "saude",
      title: "Dados de saúde (sensíveis)",
      blocks: [
        p(
          "Medidas corporais são dados pessoais sensíveis (art. 5º, II, e art. 11 da LGPD). Só são tratadas se você ativar o módulo de medidas e der um consentimento específico, registrado com data e versão do termo.",
        ),
        p(
          "Só você vê suas medidas: elas não aparecem para outras pessoas, nem para seguidores, e não são enviadas ao GUF AI. Para registrar e consultar é preciso estar conectado; elas não ficam salvas no aparelho.",
        ),
        { kind: "link", doc: "saude", text: "Ler o Termo de Consentimento para Dados de Saúde" },
      ],
    },
    {
      id: "seguidores",
      title: "Perfil, seguidores e competição",
      blocks: [
        p(
          "Toda conta tem um perfil privado com nome de usuário (@), nome e foto, que aparecem na busca e no link do perfil, junto com a bio, se você escrever uma. Objetivos e experiência, se você marcar, seguem a mesma regra dos treinos. Seus treinos só aparecem para seguidores que você aprovar ou, se você abrir o perfil, para qualquer pessoa com conta no guf. Você pode ocultar o histórico, remover seguidores e bloquear pessoas a qualquer momento.",
        ),
        p("A pontuação da competição é calculada pelas mesmas regras para todos, a partir dos treinos: constância, recordes de carga e de cardio e volume comparado à sua própria média. As regras ficam publicadas em Competição › Como funciona."),
        p(
          "Se você ligar as notificações (Configurações › Preferências), o aparelho recebe um aviso quando alguém começa a seguir você, pede para seguir ou aceita o seu pedido, e quando um competidor fica a menos de 20 pontos de passar você no mês ou passa. O aviso mostra o nome e o @ da pessoa (e, na competição, a diferença de pontos), inclusive na tela bloqueada. Para evitar excesso, o mesmo aviso de seguidor sobre a mesma pessoa sai no máximo uma vez por dia. As notificações são ligadas em cada aparelho, começam desligadas e podem ser desligadas a qualquer momento, no app ou nas configurações do celular.",
        ),
        { kind: "link", doc: "termos", anchor: "perfil-social", text: "Ler as regras do perfil nos Termos de Uso" },
      ],
    },
    {
      id: "guf-ai",
      title: "GUF AI (inteligência artificial)",
      blocks: [
        p(
          "Quando você faz uma pergunta ao GUF AI ou cola uma ficha para importar, o guf envia ao provedor de inteligência artificial (Google, pela API do Gemini, nos Estados Unidos) a sua pergunta e só os dados de treino necessários para responder: exercícios, séries, cargas, datas, rotinas, as regras da competição e o seu extrato de pontos (de onde veio cada ponto seu; nunca os pontos ou a posição de outras pessoas).",
        ),
        ul(
          "Nunca são enviados: nome, e-mail, foto, @, ids da sua conta, medidas corporais, observações escritas por você nem dados de outras pessoas.",
          "Antes de enviar, o guf remove da pergunta e-mails, CPF ou CNPJ, telefones, links e números longos.",
          "O guf usa hoje o plano gratuito da API do Gemini, em que o Google pode usar o conteúdo recebido para melhorar os próprios serviços, inclusive com revisão por pessoas. Por isso não escreva dados pessoais ou de saúde nas perguntas.",
          `As conversas ficam guardadas para você continuar de onde parou e são apagadas 180 dias depois da última mensagem ou quando você exclui a conta. Para apagar antes, peça pelo e-mail ${PRIVACY_CONTACT_EMAIL}.`,
          "O texto da ficha colada não é guardado; fica só o horário da conversão, por 2 dias, para contar o limite diário.",
          "O GUF AI só lê; ele não altera nada na sua conta. Rotinas sugeridas só são criadas depois da sua confirmação.",
        ),
      ],
    },
    {
      id: "atendimento",
      title: "Atendimento e moderação",
      blocks: [
        p(
          "Para atender pedidos de suporte e aplicar os Termos de Uso, a equipe do guf (hoje, só o responsável) usa um painel interno com acesso protegido por senha e segundo fator. O painel mostra um resumo da sua conta: nome, @, e-mail parcialmente escondido, datas, logins, plano, seguidores, total de treinos e quais documentos você aceitou.",
        ),
        ul(
          "O painel nunca mostra medidas corporais, observações, conversas com o GUF AI, séries ou cargas.",
          "Mostrar o e-mail completo e qualquer alteração ficam registrados, com o motivo e quem fez.",
          "A equipe pode corrigir o @ ou o nome (você recebe um aviso no app), mudar o plano, desvincular um login social a seu pedido, mandar um link para você criar uma senha nova (a equipe nunca vê nem escolhe a sua senha) e, por violação dos Termos, suspender ou excluir a conta.",
        ),
      ],
    },
    {
      id: "comunicados",
      title: "Comunicados no app",
      blocks: [
        p(
          "O guf pode mostrar avisos no app sobre o serviço (manutenção, mudanças na sua conta), sobre estes documentos e sobre novidades do guf. O app registra se você viu, fechou ou tocou no aviso, para não repetir o mesmo aviso.",
        ),
        p("Os avisos de novidades podem ser desligados em Configurações › Preferências › Novidades do guf no app. Avisos sobre o serviço e sobre os documentos continuam chegando."),
      ],
    },
    {
      id: "compartilhamento",
      title: "Com quem compartilhamos",
      blocks: [
        p(
          "Seus dados não são vendidos. São compartilhados só com prestadores necessários para o app funcionar, que agem em nome da controladora e sob contrato:",
        ),
        ul(
          "Supabase: banco de dados, login e envio dos e-mails de acesso. Os dados ficam guardados em São Paulo (Brasil).",
          "Vercel: hospedagem do site do app. Recebe só dados de acesso, como IP e navegador; nenhum dado de treino passa por ela.",
          "Google, se você escolher entrar com Google. O guf recebe nome, e-mail e foto.",
          "Google (API do Gemini), se você usar o GUF AI: recebe a pergunta e os dados de treino sem identificação (veja a seção GUF AI).",
          "Prestador de pagamento: o Pro ainda não está à venda. Quando estiver, uma nova versão desta política dirá qual é o prestador; ele receberá os dados de pagamento direto de você, e o guf não verá nem guardará o número do cartão.",
          "Serviço de notificações do seu navegador ou celular (Google, Apple ou Mozilla), se você ligar as notificações. O texto do aviso vai criptografado: só o seu aparelho consegue ler.",
          "Outras pessoas do guf, só o que o seu perfil mostrar a elas (veja a seção Perfil, seguidores e competição).",
          "Autoridades públicas, quando houver ordem judicial ou obrigação legal.",
        ),
      ],
    },
    {
      id: "transferencia",
      title: "Transferência internacional",
      blocks: [
        p(
          "O banco de dados fica no Brasil. Alguns prestadores ficam nos Estados Unidos: a Vercel, o Google (se você entrar com Google ou usar o GUF AI), o serviço de notificações do seu aparelho (só se você ligar as notificações) e empresas contratadas pelo Supabase. Essas transferências acontecem porque são necessárias para prestar o serviço que você contratou (art. 33, IX, combinado com o art. 7º, V, da LGPD), e esses prestadores têm compromissos públicos de proteção de dados.",
        ),
      ],
    },
    {
      id: "retencao",
      title: "Por quanto tempo guardamos",
      blocks: [
        {
          kind: "table",
          caption: "Prazos de guarda",
          head: ["Dado", "Prazo"],
          rows: [
            ["Conta, treinos e preferências", "Enquanto a conta existir"],
            ["Medidas corporais", "Até você revogar o consentimento ou excluir a conta"],
            ["Perfil social, seguidores e bloqueios", "Enquanto a conta existir; seguidores até você remover; bloqueios até desbloquear"],
            ["Avisos no celular", "Até você desligar as notificações, sair da conta no aparelho ou o aparelho deixar de aceitar notificações; o registro dos avisos de seguidores enviados, por 1 dia"],
            ["Plano e assinatura", "Enquanto a conta existir; os registros de pagamento exigidos pela lei fiscal ficam com o prestador de pagamento pelo prazo legal"],
            ["Conversas com o GUF AI", "Até 180 dias depois da última mensagem, ou até excluir a conta"],
            ["Horário das conversões de ficha", "2 dias"],
            ["Registro dos comunicados que você viu", "Até 12 meses depois de o comunicado terminar"],
            ["Suspensões e exclusões agendadas", "Enquanto a conta existir"],
            ["Registro do que a equipe viu ou alterou na sua conta", "5 anos, sem o conteúdo dos seus dados (só a ação, a data, quem fez e o motivo)"],
            ["Registros técnicos de acesso (IP, data e hora)", "Ficam nos provedores (Supabase e Vercel) pelo prazo curto de cada um; o guf não guarda um arquivo próprio desses registros"],
            ["Depois de excluir a conta", "Apagados na hora. Cópias de segurança automáticas do provedor do banco, se houver, são substituídas no ciclo dele e não são usadas para recuperar contas excluídas"],
            [
              "Prova dos seus aceites, depois de excluir a conta",
              "5 anos, só com o documento, a versão, a data e o seu e-mail transformado em código irreversível (hash)",
            ],
          ],
        },
      ],
    },
    {
      id: "direitos",
      title: "Seus direitos (art. 18) e como exercer pelo app",
      blocks: [
        p("Você pode, a qualquer momento e sem custo:"),
        ul(
          "Confirmar se seus dados são tratados e acessá-los.",
          "Corrigir dados incompletos ou desatualizados.",
          "Pedir anonimização, bloqueio ou eliminação de dados desnecessários.",
          "Levar seus dados para outro serviço (portabilidade).",
          "Saber com quem eles são compartilhados.",
          "Revogar o consentimento e saber o que acontece se não consentir.",
        ),
        action("export"),
        action("delete"),
        p(
          `Para outros pedidos, escreva para ${PRIVACY_CONTACT_EMAIL} (ou use Configurações › Privacidade › Outros pedidos sobre seus dados). A resposta sai em até ${DSAR_RESPONSE_DAYS} dias. Você também pode reclamar à ANPD (Autoridade Nacional de Proteção de Dados).`,
        ),
      ],
    },
    {
      id: "aparelho",
      title: "Dados salvos no aparelho",
      blocks: [
        p(
          "Para o treino funcionar sem internet, o app guarda no seu aparelho o treino em andamento, as alterações que ainda vão ser enviadas, cópias do histórico, dos resumos e da evolução já vistos, o cronômetro do cardio e preferências (tema, aviso do descanso, tela ligada). As alterações vão para a sua conta quando a conexão volta. Ao sair da conta, o app apaga do aparelho os dados de treino; as preferências continuam. Medidas corporais nunca ficam salvas no aparelho.",
        ),
        p("O guf não usa cookies de publicidade nem rastreadores de terceiros."),
      ],
    },
    {
      id: "seguranca",
      title: "Segurança",
      blocks: [
        p(
          "Os dados trafegam com criptografia (HTTPS) e as senhas são guardadas de forma irreversível. O banco só entrega a cada conta os dados que ela pode ver. O acesso interno é restrito a quem precisa, exige segundo fator e fica registrado. Em caso de incidente com risco relevante, você e a ANPD serão avisados (art. 48).",
        ),
      ],
    },
    {
      id: "menores",
      title: "Menores de idade",
      blocks: [
        p("O guf é destinado a pessoas com 18 anos ou mais. Se for identificada uma conta de menor de idade, ela será encerrada e os dados apagados."),
        { kind: "link", doc: "termos", anchor: "idade", text: "Ler a declaração de idade nos Termos de Uso" },
      ],
    },
    {
      id: "alteracoes",
      title: "Alterações desta política",
      blocks: [
        p(
          `Quando esta política mudar de forma relevante, o app mostra o que mudou e pede seu aceite antes de a nova versão valer. O que mudou em cada versão aparece no próprio documento; o texto de uma versão anterior pode ser pedido pelo e-mail ${PRIVACY_CONTACT_EMAIL}.`,
        ),
      ],
    },
  ],
  changes: {
    "1.3": ["Competição: os recordes de cardio (melhor ritmo ou maior distância, calculados das séries que você registra) passam a contar na pontuação, como os de carga."],
    "1.2": [
      "Editar perfil: foto enviada pelo app (reduzida no aparelho, sem os dados da câmera), bio, objetivos e experiência, todos opcionais. A bio aparece com o nome e a foto; objetivos e experiência, só para quem pode ver seus treinos. Nada disso vai para o GUF AI.",
    ],
    "1.1": [
      "GUF AI: se você perguntar sobre os seus pontos na competição, ele lê o seu extrato de pontos (só os seus; nunca os de outras pessoas).",
    ],
    "1.0": [
      `Versão oficial: o responsável pelos seus dados é ${CONTROLLER_DESCRIPTION}. Por ser agente de pequeno porte, não há encarregado designado; o canal é ${PRIVACY_CONTACT_EMAIL}.`,
      "Nova seção sobre o GUF AI: o que vai para o Google (Gemini), o que nunca vai e por quanto tempo as conversas ficam.",
      "Novas seções sobre o atendimento da equipe (o que o painel mostra e o que fica registrado) e os comunicados no app (com opção de desligar as novidades).",
      "Prazos de guarda completos, inclusive dos registros técnicos de acesso e das cópias de segurança, e a lista do que fica salvo no aparelho.",
    ],
    "0.7-dev": [
      "Medidas corporais: o módulo registra só circunferências, em centímetros. Só você vê, e elas não vão para o GUF AI.",
    ],
    "0.6-dev": [
      "Novo: planos Free e Pro. Guardamos o seu plano, de onde ele vem e até quando vale, para liberar o que ele inclui.",
      "Se você assinar o Pro, o pagamento é feito com um prestador de pagamento, que recebe os dados do cartão direto de você; o guf recebe só a situação da assinatura.",
    ],
    "0.5-dev": [
      "O esforço do treino (nota de 1 a 10) não é mais coletado, e o ajuste automático do esforço na pontuação deixou de existir.",
      "A pontuação da competição passa a usar a constância, os recordes de carga e o volume dos treinos.",
    ],
    "0.4-dev": [
      "Novo e opcional: notificações no celular quando alguém segue você, pede para seguir ou aceita seu pedido, e quando um competidor fica a menos de 20 pontos de passar você no mês ou passa. Começam desligadas.",
      "Ao ligar as notificações, guardamos o endereço do aparelho no serviço de notificações (Google, Apple ou Mozilla) até você desligar ou sair da conta.",
    ],
    "0.3-dev": [
      "Novo: perfil com nome de usuário (@), seguidores e competição entre amigos. Seu perfil começa privado.",
      "Seus treinos só aparecem para seguidores que você aprovar ou, se abrir o perfil, para qualquer pessoa com conta no guf.",
      "Novo dado opcional: o esforço do treino (1 a 10), usado na pontuação.",
    ],
    "0.2-dev": [
      "Seus dados ficam guardados no Brasil (São Paulo); a política agora diz quais prestadores usamos (Supabase e Vercel) e quais ficam nos EUA.",
      `Novo contato para pedidos sobre seus dados: ${PRIVACY_CONTACT_EMAIL}, também em Configurações › Privacidade.`,
      "Ao excluir a conta, os dados são apagados na hora; só a prova dos seus aceites fica guardada por 5 anos, com o e-mail em código irreversível.",
      "O prazo dos registros de acesso será definido na versão final (antes dizia 6 meses).",
    ],
  },
};

const HEALTH: LegalDocumentContent = {
  doc: "saude",
  docType: "health_consent",
  route: "/termo-de-saude",
  title: "Termo de Consentimento para Dados de Saúde",
  shortTitle: "Termo de Saúde",
  icon: "heart-pulse",
  summary: [
    { icon: "ruler", text: "Circunferências do corpo, como braço, coxa e abdômen, são dados de saúde, considerados sensíveis pela LGPD." },
    { icon: "shield", text: "Só você vê suas medidas. Elas não aparecem para quem visita seu perfil, nem para seguidores." },
    { icon: "toggle-left", text: "O módulo é opcional. O resto do app funciona sem ele." },
    { icon: "trash-2", text: "Revogar o consentimento apaga todas as medidas registradas." },
    { icon: "ban", text: "As medidas não são usadas para publicidade e não vão para ferramentas de análise nem para o GUF AI." },
  ],
  sections: [
    {
      id: "medidas",
      title: "O que são as medidas corporais",
      blocks: [
        p(
          "O módulo de medidas permite registrar, com data, circunferências em centímetros: bíceps, antebraço, coxa e panturrilha (lado esquerdo e direito), peitoral, ombros, abdômen e quadril.",
        ),
        p("Você preenche só o que mediu. Nada é medido ou calculado automaticamente."),
        p(
          "Pela LGPD, dados referentes à saúde são dados pessoais sensíveis (art. 5º, II) e só podem ser tratados com consentimento específico e destacado (art. 11, I).",
        ),
      ],
    },
    {
      id: "finalidade",
      title: "Finalidade única",
      blocks: [p("As medidas são usadas só para acompanhar a sua evolução: gráficos, comparação entre datas e registros, numa área privada do seu perfil.")],
    },
    {
      id: "quem-ve",
      title: "Quem vê suas medidas",
      blocks: [
        p(
          "Só você. A área fica em Perfil › Medidas corporais e não existe para outras pessoas: quem visita seu perfil, inclusive seguidores, não vê o botão nem as medidas, e elas não entram na competição.",
        ),
        p("O GUF AI não tem acesso às medidas: elas nunca são enviadas ao provedor de inteligência artificial."),
        p(
          "As medidas ficam guardadas no servidor do guf, no Brasil, e não são salvas no aparelho para uso sem internet. Para registrar e consultar, é preciso estar conectado.",
        ),
      ],
    },
    {
      id: "opcional",
      title: "Consentimento opcional e revogável",
      blocks: [
        p("Se você não autorizar, todo o restante do app continua funcionando."),
        p("O consentimento é registrado com data, hora e versão deste termo, e pode ser revogado a qualquer momento."),
      ],
    },
    {
      id: "revogar",
      title: "Revogar apaga as medidas",
      blocks: [
        {
          kind: "note",
          icon: "triangle-alert",
          text: "Ao revogar, todas as medidas registradas são apagadas e o módulo é desativado. Se quiser guardar uma cópia, exporte seus dados antes.",
        },
        action("export"),
      ],
    },
    {
      id: "nao-usamos",
      title: "O que não fazemos com as medidas",
      blocks: [
        ul(
          "Não mostramos para outras pessoas.",
          "Não usamos para publicidade nem para criar perfis de consumo.",
          "Não vendemos nem compartilhamos com terceiros para fins comerciais.",
          "Não enviamos para ferramentas de análise nem para o GUF AI.",
          "Não usamos para decisões automatizadas sobre você.",
        ),
      ],
    },
    {
      id: "como-revogar",
      title: "Como revogar no app",
      blocks: [
        p("Em Configurações › Privacidade › Dados de saúde, toque em “Revogar consentimento”. Uma confirmação mostra o que será apagado antes de concluir."),
        action("revoke"),
      ],
    },
  ],
  changes: {
    "0.2-dev": [
      "O termo agora lista exatamente o que o módulo registra: circunferências em centímetros (o peso e o percentual de gordura saíram).",
      "Nova seção “Quem vê suas medidas”: só você, numa área privada do perfil; o GUF AI não tem acesso.",
      "As medidas não são salvas no aparelho para uso sem internet.",
    ],
  },
};

/** Aceito só na tela de assinatura do Pro, junto com o que estiver pendente do cadastro. */
const SUBSCRIPTION: LegalDocumentContent = {
  doc: "assinatura",
  docType: "subscription_terms",
  route: "/termos-da-assinatura",
  title: "Termos da Assinatura",
  shortTitle: "Termos da Assinatura",
  icon: "file-text",
  summary: [
    { icon: "target", text: "O Pro tira os limites do plano Free." },
    { icon: "bell", text: "Preço, cobrança e renovação aparecem antes de você confirmar. Mudança de preço é avisada antes de valer." },
    { icon: "circle-x", text: "Cancele quando quiser: o Pro continua até o fim do período já pago." },
    { icon: "toggle-left", text: "Desistiu em até 7 dias da contratação? Você recebe o valor de volta." },
    { icon: "folder-lock", text: "Quando o Pro termina, você volta ao Free sem perder nenhum dado." },
  ],
  sections: [
    {
      id: "objeto",
      title: "O que é a assinatura",
      blocks: [
        p(
          `A assinatura do plano Pro do guf, mantido por ${CONTROLLER_DESCRIPTION}, libera as funcionalidades do Pro enquanto estiver ativa. A lista atualizada do que cada plano inclui fica na tela Planos do app.`,
        ),
        p("Estes termos completam os Termos de Uso; em caso de conflito sobre a assinatura, valem estes."),
      ],
    },
    {
      id: "preco",
      title: "Preço e cobrança",
      blocks: [
        {
          kind: "note",
          icon: "bell",
          text: "O Pro ainda não está à venda e nada é cobrado. Antes de qualquer cobrança, uma nova versão destes termos informará o preço, a periodicidade, o prestador de pagamento e o canal de cancelamento, e você precisará aceitá-la.",
        },
        p("Quando a venda começar, o valor e a data da cobrança aparecerão na tela de assinatura antes da confirmação. Mudanças de preço serão avisadas no app e por e-mail antes de valer e só valerão a partir da renovação seguinte."),
      ],
    },
    {
      id: "renovacao",
      title: "Renovação e cancelamento",
      blocks: [
        p("A assinatura se renova automaticamente ao fim de cada período, até você cancelar."),
        p(
          "Você pode cancelar a qualquer momento, sem multa. O Pro continua até o fim do período já pago e não há nova cobrança. Se o pagamento falhar, o prestador tenta de novo por alguns dias; sem pagamento, o plano volta ao Free.",
        ),
      ],
    },
    {
      id: "arrependimento",
      title: "Direito de arrependimento",
      blocks: [
        p(
          `Por ser uma contratação pela internet, você pode desistir em até 7 dias a contar da contratação e receber de volta o valor pago (art. 49 do Código de Defesa do Consumidor). O pedido pode ser feito pelo e-mail ${PRIVACY_CONTACT_EMAIL}.`,
        ),
      ],
    },
    {
      id: "fim",
      title: "Quando o Pro termina",
      blocks: [
        p(
          "Com o fim da assinatura, sua conta volta ao plano Free. Nenhum dado é apagado: projetos, rotinas e treinos continuam salvos e podem ser exportados. Só não é possível criar além dos limites do Free, e os gráficos voltam a mostrar o mês atual e o anterior.",
        ),
      ],
    },
    {
      id: "dados",
      title: "Seus dados na assinatura",
      blocks: [
        p(
          "Os dados do cartão vão direto para o prestador de pagamento: o guf não os vê nem guarda. O guf recebe só a situação da assinatura (ativa, em atraso, cancelada) e o período pago. Detalhes na Política de Privacidade.",
        ),
        { kind: "link", doc: "privacidade", anchor: "compartilhamento", text: "Ler a Política de Privacidade" },
      ],
    },
  ],
  changes: {
    "1.0": [
      `Versão oficial, mantida por ${CONTROLLER_DESCRIPTION}.`,
      "O Pro ainda não está à venda: preço, prestador de pagamento e canal de cancelamento entram numa nova versão, que você aceita antes de qualquer cobrança.",
    ],
    "0.2-dev": ["Quando o Pro termina, seus treinos continuam completos; só os gráficos voltam a mostrar o período do plano Free."],
  },
};

export const LEGAL_DOCUMENTS: Record<LegalReaderDoc, LegalDocumentContent> = {
  termos: TERMS,
  privacidade: PRIVACY,
  saude: HEALTH,
  assinatura: SUBSCRIPTION,
};

/** Ordem na central "Documentos legais" e em "Outros documentos". */
export const LEGAL_READER_ORDER: LegalReaderDoc[] = ["termos", "privacidade", "saude", "assinatura"];

/** Link "mailto:" já com o assunto do pedido. */
export function privacyRequestMailto(): string {
  return `mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent("Pedido sobre meus dados (LGPD)")}`;
}

/** Contato e responsável (rodapé do leitor). Sem encarregado: agente de pequeno porte (Res. CD/ANPD nº 2/2022, art. 11). */
export const LEGAL_DPO_LINE = `${PRIVACY_CONTACT_EMAIL} · Sem encarregado designado (agente de pequeno porte)`;
export const LEGAL_COMPANY_LINE = `${CONTROLLER_NAME} · pessoa física`;
export const LEGAL_DPO_EMAIL = PRIVACY_CONTACT_EMAIL;

export interface LegalTextPart {
  text: string;
  /** Marcador de dado real a preencher ("[CNPJ]"). */
  placeholder: boolean;
}

/** Separa os marcadores "[…]" do texto (o leitor os destaca até o texto final entrar). */
export function legalTextParts(text: string): LegalTextPart[] {
  return text
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((t) => ({ text: t, placeholder: t.startsWith("[") && t.endsWith("]") }));
}

/** Documento do leitor a partir do doc_type do banco (declaração de idade = Termos#idade). */
export function legalReaderTarget(docType: string): { doc: LegalReaderDoc; anchor?: string } | null {
  switch (docType) {
    case "terms":
      return { doc: "termos" };
    case "privacy":
      return { doc: "privacidade" };
    case "age_declaration":
      return { doc: "termos", anchor: "idade" };
    case "health_consent":
      return { doc: "saude" };
    case "subscription_terms":
      return { doc: "assinatura" };
    default:
      return null;
  }
}

/** Situação do aceite de um documento para quem está logado. */
export type LegalAcceptance = "accepted" | "outdated" | "not_accepted";

/** Aceitou a versão vigente, uma anterior ou nenhuma (sem versão vigente conhecida: vale o aceite). */
export function legalAcceptance(currentVersion: string | null, acceptedVersion: string | null): LegalAcceptance {
  if (!acceptedVersion) return "not_accepted";
  if (currentVersion && currentVersion !== acceptedVersion) return "outdated";
  return "accepted";
}
