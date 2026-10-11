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
  | "shield";

/** Atalhos dentro do texto que levam a Perfil › Privacidade. */
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
    { icon: "circle-x", text: "Você pode encerrar a conta quando quiser, em Perfil › Privacidade." },
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
  changes: {},
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
    { icon: "download", text: "Você pode exportar ou apagar seus dados pelo app, em Perfil › Privacidade." },
    { icon: "globe", text: "Alguns provedores ficam fora do Brasil, e a transferência segue as regras da LGPD." },
  ],
  sections: [
    {
      id: "quem-somos",
      title: "Quem somos",
      blocks: [
        p(
          "O guf é oferecido por [RAZÃO SOCIAL], CNPJ [CNPJ], com sede em [ENDEREÇO]. Para a LGPD, ela é a controladora dos seus dados pessoais: decide como e para que eles são tratados.",
        ),
        p("O encarregado pelo tratamento de dados (DPO) é [NOME DO ENCARREGADO], pelo e-mail [E-MAIL DO ENCARREGADO]."),
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
      id: "compartilhamento",
      title: "Com quem compartilhamos",
      blocks: [
        p(
          "Seus dados não são vendidos. São compartilhados só com prestadores necessários para o app funcionar, que agem em nome da controladora e sob contrato:",
        ),
        ul(
          "Provedor de infraestrutura e banco de dados: [PROVEDOR DE INFRAESTRUTURA].",
          "Google, se você escolher entrar com Google. O guf recebe nome, e-mail e foto.",
          "Autoridades públicas, quando houver ordem judicial ou obrigação legal.",
        ),
      ],
    },
    {
      id: "transferencia",
      title: "Transferência internacional",
      blocks: [
        p(
          "Alguns prestadores guardam dados fora do Brasil, em [PAÍS DOS SERVIDORES]. Essas transferências seguem o art. 33 da LGPD, com cláusulas contratuais padrão.",
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
            ["Registros de acesso", "6 meses, pelo Marco Civil da Internet (art. 15)"],
            ["Depois de excluir a conta", "Apagados em até [PRAZO] dias, exceto o que a lei obriga guardar"],
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
          "Para outros pedidos, escreva para [E-MAIL DO ENCARREGADO]. A resposta sai em até 15 dias. Você também pode reclamar à ANPD (Autoridade Nacional de Proteção de Dados).",
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
  changes: {},
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
        p("Em Perfil › Privacidade › Dados de saúde, toque em “Revogar consentimento”. Uma confirmação mostra o que será apagado antes de concluir."),
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

/** Contato do encarregado e da empresa (rodapé do leitor). Marcadores até o texto final. */
export const LEGAL_DPO_LINE = "[NOME DO ENCARREGADO] · [E-MAIL DO ENCARREGADO]";
export const LEGAL_COMPANY_LINE = "[RAZÃO SOCIAL] · CNPJ [CNPJ] · [ENDEREÇO]";
export const LEGAL_DPO_EMAIL = "[E-MAIL DO ENCARREGADO]";

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
