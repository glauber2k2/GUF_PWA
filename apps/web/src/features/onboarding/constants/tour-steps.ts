import type { GufRatOccasion } from "@/shared/components/ds";
import type { TourTargetId } from "./tour-targets";

/**
 * Versão do tour, guardada na conta ao concluir (`profiles.tour_completed_version`). Subir a versão
 * mostra o tour de novo a todos (v2 = tour completo, que substituiu o curto de 6 passos da v1).
 */
export const TOUR_VERSION = 2;

export type TourChapter = "Primeiros passos" | "Início" | "Projetos" | "Treino" | "Competição" | "Perfil";

/**
 * O que o tour sabe sobre a conta para decidir quais passos mostrar. Quem monta é a composição
 * (`app/`), para o tour não depender das features de onde os fatos vêm. Condição nova = campo novo
 * aqui + valor na composição; o provider não muda.
 */
export interface TourFacts {
  /** O @ ainda é o aleatório do cadastro (`guf.xxxxxx`). */
  hasGeneratedHandle: boolean;
}

export type TourCondition = keyof TourFacts;

export interface TourStep {
  id: string;
  chapter: TourChapter;
  /** Rota onde o passo aparece (só o caminho, sem barra no fim; o tour navega até ela). */
  route: string;
  /**
   * Alvo destacado. Lista = alternativas em ordem (ex.: o atalho de evolução só existe depois do
   * 1º treino). Sem alvo, o balão aparece no centro.
   */
  target?: TourTargetId | readonly TourTargetId[];
  /** Demonstração desenhada pelo tour sobre a tela (o treino só abre com um treino de verdade). */
  stage?: "workout";
  title: string;
  body: string;
  rat?: GufRatOccasion;
  /** Só aparece quando o fato da conta é verdadeiro (sem condição = sempre). */
  showIf?: TourCondition;
}

/**
 * Tour completo: primeiros passos (seu @, o GUF AI e importar a ficha) e depois a ordem em que a
 * pessoa usa o app: Início (treino de hoje, semana, sequência, histórico) → Projetos e rotinas →
 * Treino (demonstração) → Competição e amigos → Perfil.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    chapter: "Primeiros passos",
    route: "/",
    title: "Bem-vindo ao guf",
    body: "Vamos dar uma volta pelo app: seu perfil, o GUF AI, projetos, treino e competição. Leva uns 2 minutos e dá para pular quando quiser.",
    rat: "welcome",
  },
  {
    id: "handle",
    chapter: "Primeiros passos",
    route: "/perfil",
    target: "editProfile",
    showIf: "hasGeneratedHandle",
    title: "Escolha o seu @",
    body: "Seu @ ainda é o que o guf criou no cadastro. Toque em Editar perfil e escolha um com a sua cara: é por ele que seus amigos vão te encontrar.",
    rat: "tip",
  },
  {
    id: "guf-ai",
    chapter: "Primeiros passos",
    route: "/",
    target: "aiAssistant",
    title: "Conheça o GUF AI",
    body: "Pergunte sobre os seus treinos: sua evolução, os seus pontos na competição, alternativas para um exercício. Ele responde com os seus dados.",
    rat: "thinking",
  },
  {
    id: "plan-import",
    chapter: "Primeiros passos",
    route: "/projetos",
    target: "planImport",
    title: "Importe sua ficha com IA",
    body: "Recebeu a ficha do personal? Cole o texto aqui e o GUF AI monta o projeto e as rotinas. Você revisa tudo antes de criar.",
    rat: "saved",
  },
  {
    id: "today",
    chapter: "Início",
    route: "/",
    target: "todayCard",
    title: "Treino de hoje",
    body: "Aqui aparece o treino sugerido para hoje pelo seu projeto ativo. Toque para começar. Se já treinou, você vê o resumo.",
    rat: "warmup",
  },
  {
    id: "week",
    chapter: "Início",
    route: "/",
    target: "weekCard",
    title: "Esta semana",
    body: "Os dias em que você treinou nesta semana e quanto falta para a sua meta. Toque num dia para ver o treino.",
    rat: "info",
  },
  {
    id: "streak",
    chapter: "Início",
    route: "/",
    target: "streakCard",
    title: "Sua sequência",
    body: "A sequência conta semanas seguidas com pelo menos 1 treino (de domingo a sábado). Uma semana inteira sem treinar e ela zera. A chama avisa quando a semana está em risco.",
    rat: "streak",
  },
  {
    id: "calendar",
    chapter: "Início",
    route: "/",
    target: "calendar",
    title: "Histórico",
    body: "O calendário marca os dias treinados: quanto mais forte a cor, maior o volume. Toque num dia para ver os treinos e os recordes.",
    rat: "tip",
  },
  {
    id: "evolution",
    chapter: "Início",
    route: "/",
    target: ["evolution", "history"],
    title: "Evolução por exercício",
    body: "Depois do primeiro treino, aparece aqui o atalho para a evolução de cada exercício: carga máxima, volume, 1RM estimado e recordes ao longo do tempo.",
    rat: "goalReached",
  },
  {
    id: "projects",
    chapter: "Projetos",
    route: "/",
    target: "projectsTab",
    title: "Projetos e rotinas",
    body: "Um projeto agrupa suas rotinas, como Treino A, B e C. Só um fica ativo por vez, e é ele que define o treino de cada dia.",
    rat: "thinking",
  },
  {
    id: "new-project",
    chapter: "Projetos",
    route: "/projetos",
    target: "newProject",
    title: "Criar um projeto",
    body: "Toque em Novo projeto para começar um plano, como um ciclo de hipertrofia. Seus Favoritos já vêm prontos.",
    rat: "tip",
  },
  {
    id: "routines",
    chapter: "Projetos",
    route: "/projetos",
    target: ["activeProject", "newProject"],
    title: "Montar as rotinas",
    body: "Toque no projeto para ver e criar rotinas: escolha os exercícios, as séries, as repetições, o descanso e os dias da semana.",
    rat: "saved",
  },
  {
    id: "start-workout",
    chapter: "Treino",
    route: "/",
    target: "trainTab",
    title: "Começar um treino",
    body: "Toque em Treinar para escolher uma rotina do projeto ativo ou um treino vazio. Com um treino aberto, o mesmo botão volta para ele.",
    rat: "warmup",
  },
  {
    id: "workout-header",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "workoutHeader",
    title: "A tela do treino",
    body: "No topo ficam o tempo de treino e as séries feitas. A pausa para o relógio; a seta minimiza o treino sem fechar.",
    rat: "lift",
  },
  {
    id: "workout-exercise",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "exerciseHeader",
    title: "Cada exercício",
    body: "Toque no nome para abrir ou recolher as séries. Segure o cabeçalho para mudar a ordem dos exercícios.",
    rat: "tip",
  },
  {
    id: "workout-set",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "setRow",
    title: "Cada linha é uma série",
    body: "Tipo da série, o que você fez no último treino (Anterior), carga, repetições e o botão de concluir.",
    rat: "info",
  },
  {
    id: "workout-load-reps",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "setLoadAndReps",
    title: "Carga e repetições",
    body: "Toque na carga ou nas repetições para editar. Use o teclado ou os atalhos −1, +1, +5 e +10.",
    rat: "loadUp",
  },
  {
    id: "workout-done",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "setDone",
    title: "Concluir a série",
    body: "Terminou a série? Toque aqui. O descanso começa sozinho e, se bater recorde, você vê na hora.",
    rat: "personalRecord",
  },
  {
    id: "workout-set-type",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "setType",
    title: "Tipo da série",
    body: "Toque no número da série para trocar o tipo: aquecimento, drop set ou até a falha. Aquecimento não entra no volume.",
    rat: "dropSet",
  },
  {
    id: "workout-delete-set",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "secondSetRow",
    title: "Excluir uma série",
    body: "Arraste a linha da série para a esquerda para excluir. Se foi sem querer, toque em Desfazer no aviso.",
    rat: "confirmDelete",
  },
  {
    id: "workout-add-set",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "addSet",
    title: "Adicionar série",
    body: "Cria mais uma série, já com a carga e as repetições da anterior.",
    rat: "lift",
  },
  {
    id: "workout-exercise-menu",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "exerciseMenu",
    title: "Trocar ou remover o exercício",
    body: "No menu do exercício você escreve uma observação, troca o exercício (mantendo as séries) ou remove ele do treino.",
    rat: "thinking",
  },
  {
    id: "workout-add-exercise",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "workoutAddExercise",
    title: "Adicionar exercício",
    body: "Para incluir outro exercício, toque aqui: busque pelo nome ou filtre pelos músculos.",
    rat: "legDay",
  },
  {
    id: "workout-finish",
    chapter: "Treino",
    route: "/",
    stage: "workout",
    target: "workoutFinish",
    title: "Finalizar o treino",
    body: "Ao terminar, toque em Finalizar treino. Séries não concluídas saem, e você vê o resumo, os recordes e pode compartilhar nos stories.",
    rat: "workoutDone",
  },
  {
    id: "compete",
    chapter: "Competição",
    route: "/",
    target: "competeTab",
    title: "Competir com amigos",
    body: "Quem se segue mutuamente entra na mesma competição. O ranking do mês recomeça a cada temporada.",
    rat: "goalReached",
  },
  {
    id: "competition-filters",
    chapter: "Competição",
    route: "/competicao",
    target: "competitionFilters",
    title: "Período e métrica",
    body: "Escolha o período (este mês, 3 meses, 1 ano ou datas suas) e compare por pontos, volume, treinos ou recordes.",
    rat: "info",
  },
  {
    id: "competition-rules",
    chapter: "Competição",
    route: "/competicao",
    target: "competitionRules",
    title: "Como os pontos funcionam",
    body: "O que mais pesa é a constância: 3 treinos na semana já valem 60 pontos, e semanas seguidas cumpridas somam mais. Depois vêm os recordes batidos e o seu volume. Toque aqui para ver a regra completa.",
    rat: "thinking",
  },
  {
    id: "invite",
    chapter: "Competição",
    route: "/competicao",
    target: "inviteFriends",
    title: "Adicionar amigos",
    body: "Toque aqui para encontrar pessoas e convidar seus amigos.",
    rat: "welcome",
  },
  {
    id: "people-search",
    chapter: "Competição",
    route: "/buscar-pessoas",
    target: "peopleSearch",
    title: "Encontrar pessoas",
    body: "Busque pelo @ ou pelo nome e toque em Seguir. Quando vocês dois se seguem, já competem. Também dá para mandar o link do seu perfil.",
    rat: "tip",
  },
  {
    id: "profile",
    chapter: "Perfil",
    route: "/",
    target: "profileTab",
    title: "Seu perfil",
    body: "Seu @, seguidores e evolução. Nos três pontinhos ficam as Configurações: privacidade, notificações e este tutorial.",
    rat: "info",
  },
  {
    id: "done",
    chapter: "Perfil",
    route: "/",
    title: "Tudo pronto!",
    body: "Agora é com você: monte sua rotina e registre o primeiro treino. Bons treinos!",
    rat: "workoutDone",
  },
];
