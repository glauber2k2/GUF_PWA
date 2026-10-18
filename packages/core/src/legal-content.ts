/**
 * Conteúdo dos documentos legais lidos DENTRO do app (/termos, /privacidade, /termo-de-saude).
 * Puro (sem React): o app web e o futuro app mobile renderizam a mesma estrutura.
 *
 * ATENÇÃO: texto provisório do protótipo (Claude Design), SEM validação jurídica.
 * Os marcadores entre colchetes ([RAZÃO SOCIAL], [CNPJ]…) são dados reais a preencher.
 * A redação final é do jurídico e entra junto com as versões definitivas em legal_documents
 * (nova migration). Enquanto LEGAL_CONTENT_IS_DRAFT for true, o leitor mostra "Rascunho".
 */

export const LEGAL_CONTENT_IS_DRAFT = true;

/**
 * Canal de comunicação com o titular para pedidos sobre dados (LGPD art. 18; Res. CD/ANPD nº 2/2022, art. 11).
 * Provisório do beta: o Encarregado será designado antes do lançamento (.lgpd/STATUS.md).
 * Fica no topo porque os textos abaixo o usam (mudar o e-mail muda o hash da Política: nova versão).
 */
export const PRIVACY_CONTACT_EMAIL = "devglaubermonteiro@gmail.com";
/** Prazo de resposta a pedidos do titular (LGPD, art. 19, II). */
export const DSAR_RESPONSE_DAYS = 15;

/** Documento do leitor (rota do app) ↔ doc_type do banco. */
export type LegalReaderDoc = "termos" | "privacidade" | "saude";
export type LegalReaderDocType = "terms" | "privacy" | "health_consent";

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
          "Estes Termos de Uso regulam o uso do guf, oferecido por [RAZÃO SOCIAL], CNPJ [CNPJ]. Ao criar uma conta, você declara que leu e aceita estes termos e a Política de Privacidade.",
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
          "Se notar um acesso que não foi seu, escreva para [E-MAIL DE SUPORTE].",
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
          "Treinos, rotinas, notas e medidas que você registra são seus. A [RAZÃO SOCIAL] só os usa para prestar o serviço, como descrito na Política de Privacidade.",
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
          "O perfil começa privado: só seguidores que você aprovar veem sua evolução, sequência e histórico de treinos. Se você abrir o perfil, qualquer pessoa com conta no guf vê esses dados, e seguir não precisa mais de aprovação. Fechar de novo não remove quem já segue você: só quem chegar depois precisa de aprovação.",
        ),
        ul(
          "Você pode ocultar o histórico de treinos a qualquer momento; evolução, sequência e competição continuam visíveis.",
          "Você pode remover qualquer seguidor ou bloquear uma pessoa. Bloquear desfaz os vínculos dos dois lados.",
          "Quem vocês se seguem mutuamente compete com você num ranking de pontos, pelas mesmas regras para todos, publicadas no app.",
          "Medidas corporais, observações escritas por você e o esforço informado em cada treino nunca aparecem para outras pessoas.",
          "Não há chat nem mensagens entre usuários. Use o perfil com respeito: contas usadas para assediar outras pessoas podem ser encerradas.",
        ),
      ],
    },
    {
      id: "planos",
      title: "Planos pagos (futuro)",
      blocks: [
        p(
          "Hoje o guf é gratuito. Se forem criados planos pagos, preço, forma de cobrança e cancelamento serão apresentados antes da contratação, e nada será cobrado sem a sua confirmação.",
        ),
      ],
    },
    {
      id: "encerramento",
      title: "Encerramento de conta",
      blocks: [
        p("Você pode excluir sua conta a qualquer momento. A exclusão apaga treinos, rotinas, projetos e medidas."),
        action("delete"),
        p("A conta pode ser suspensa se estes termos forem violados, com aviso prévio, salvo quando a lei exigir ação imediata."),
      ],
    },
    {
      id: "responsabilidade",
      title: "Limitação de responsabilidade",
      blocks: [
        p(
          "A [RAZÃO SOCIAL] trabalha para manter o app disponível e seguro, mas não responde por lesões decorrentes da execução dos exercícios nem por indisponibilidades temporárias, nos limites do Código de Defesa do Consumidor.",
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
      blocks: [p("Estes termos seguem a lei brasileira. Fica eleito o foro do domicílio do usuário. Dúvidas: [E-MAIL DE SUPORTE].")],
    },
  ],
  changes: {
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
  ],
  sections: [
    {
      id: "quem-somos",
      title: "Quem somos",
      blocks: [
        p(
          "O guf é oferecido por [RAZÃO SOCIAL], CNPJ [CNPJ], com sede em [ENDEREÇO]. Para a LGPD, ela é a controladora dos seus dados pessoais: decide como e para que eles são tratados.",
        ),
        p(
          `O encarregado pelo tratamento de dados (DPO) é [NOME DO ENCARREGADO]. Até a designação, dúvidas e pedidos sobre seus dados vão para ${PRIVACY_CONTACT_EMAIL}.`,
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
            ["Foto do perfil", "Imagem enviada ou vinda do Google", "Você, opcional"],
            ["Perfil social", "Nome de usuário (@), seguidores, pedidos e bloqueios", "Você"],
            ["Esforço do treino", "Nota de 1 a 10 informada ao finalizar", "Você, opcional"],
            ["Medidas corporais", "Peso, % de gordura e circunferências", "Você, opcional e com consentimento"],
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
            ["Mostrar seu perfil (@, nome e foto) na busca e receber pedidos para seguir", "Conta e perfil social", "Execução de contrato (art. 7º, V)"],
            ["Mostrar seus treinos a quem você aprovar (ou a todos, se abrir o perfil) e competir", "Treinos, esforço e pontuação", "Execução de contrato (art. 7º, V), pela sua escolha no app"],
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
        { kind: "link", doc: "saude", text: "Ler o Termo de Consentimento para Dados de Saúde" },
      ],
    },
    {
      id: "seguidores",
      title: "Perfil, seguidores e competição",
      blocks: [
        p(
          "Toda conta tem um perfil privado com nome de usuário (@), nome e foto, que aparecem na busca e no link do perfil. Seus treinos só aparecem para seguidores que você aprovar ou, se você abrir o perfil, para qualquer pessoa com conta no guf. Você pode ocultar o histórico, remover seguidores e bloquear pessoas a qualquer momento.",
        ),
        p("A pontuação da competição é calculada pelas mesmas regras para todos. O esforço muito acima da sua média é ajustado automaticamente; você vê o motivo e pode pedir revisão (art. 20)."),
        { kind: "link", doc: "termos", anchor: "perfil-social", text: "Ler as regras do perfil nos Termos de Uso" },
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
          "O banco de dados fica no Brasil. Alguns prestadores ficam nos Estados Unidos: a Vercel, o Google (só se você entrar com Google) e empresas contratadas pelo Supabase. Essas transferências seguem o art. 33 da LGPD, com [MECANISMO DE TRANSFERÊNCIA].",
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
            ["Registros de acesso", "[PRAZO DOS REGISTROS DE ACESSO]"],
            ["Depois de excluir a conta", "Apagados na hora. Cópias de segurança do provedor somem em até [PRAZO DOS BACKUPS]"],
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
          "Para o treino funcionar sem internet, o app guarda no seu aparelho o treino em andamento, as rotinas e a preferência de tema. Esses dados vão para a sua conta quando a conexão volta.",
        ),
        p("O guf não usa cookies de publicidade nem rastreadores de terceiros."),
      ],
    },
    {
      id: "seguranca",
      title: "Segurança",
      blocks: [
        p(
          "Os dados trafegam com criptografia (HTTPS) e as senhas são guardadas de forma irreversível. O acesso interno é restrito a quem precisa. Em caso de incidente com risco relevante, você e a ANPD serão avisados (art. 48).",
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
          "Quando esta política mudar de forma relevante, o app mostra o que mudou e pede seu aceite antes de a nova versão valer. Versões anteriores ficam em [ENDEREÇO DO HISTÓRICO DE VERSÕES].",
        ),
      ],
    },
  ],
  changes: {
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
    { icon: "ruler", text: "Peso, % de gordura e circunferências são dados de saúde, considerados sensíveis pela LGPD." },
    { icon: "target", text: "São usados só para acompanhar a sua evolução." },
    { icon: "toggle-left", text: "O módulo é opcional. O resto do app funciona sem ele." },
    { icon: "trash-2", text: "Revogar o consentimento apaga todas as medidas registradas." },
    { icon: "ban", text: "As medidas não são usadas para publicidade nem enviadas a ferramentas de análise." },
  ],
  sections: [
    {
      id: "medidas",
      title: "O que são as medidas corporais",
      blocks: [
        p("O módulo de medidas permite registrar peso, percentual de gordura e circunferências, como cintura, braço e coxa, com data."),
        p(
          "Pela LGPD, dados referentes à saúde são dados pessoais sensíveis (art. 5º, II) e só podem ser tratados com consentimento específico e destacado (art. 11, I).",
        ),
      ],
    },
    {
      id: "finalidade",
      title: "Finalidade única",
      blocks: [p("As medidas são usadas só para acompanhar a sua evolução: gráficos, comparação entre datas e histórico no seu perfil.")],
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
          "Não usamos para publicidade nem para criar perfis de consumo.",
          "Não vendemos nem compartilhamos com terceiros para fins comerciais.",
          "Não enviamos para ferramentas de análise.",
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
  changes: {},
};

export const LEGAL_DOCUMENTS: Record<LegalReaderDoc, LegalDocumentContent> = {
  termos: TERMS,
  privacidade: PRIVACY,
  saude: HEALTH,
};

/** Ordem na central "Documentos legais" e em "Outros documentos". */
export const LEGAL_READER_ORDER: LegalReaderDoc[] = ["termos", "privacidade", "saude"];

/** Link "mailto:" já com o assunto do pedido. */
export function privacyRequestMailto(): string {
  return `mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent("Pedido sobre meus dados (LGPD)")}`;
}

/** Contato do encarregado e da empresa (rodapé do leitor). Marcadores até o texto final. */
export const LEGAL_DPO_LINE = `${PRIVACY_CONTACT_EMAIL} · Encarregado: [A DESIGNAR]`;
export const LEGAL_COMPANY_LINE = "[RAZÃO SOCIAL] · CNPJ [CNPJ] · [ENDEREÇO]";
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
