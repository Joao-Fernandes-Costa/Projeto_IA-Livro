export const WORDS_PER_PAGE_ESTIMATE = 350;
export const TOKENS_PER_PAGE_ESTIMATE = 500;
export const FREE_MODEL_MAX_PAGES = 1800; // Baseado no Gemini Flash Free Tier (~1M tokens)

export const MAX_PAGES_PER_STUDY = 30;
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const ACCEPTED_FORMATS_TEXT = "JPG, JPEG, PNG, WEBP, HEIC";

export const STUDY_MESSAGES = {
  INVALID_IMAGE: "Este arquivo não é uma imagem válida.",
  FILE_TOO_LARGE: "Cada imagem deve ter no máximo 15 MB.",
  MAX_PAGES_EXCEEDED: "Você pode adicionar até 30 páginas por estudo.",
  DUPLICATE_FILE: "Esta página já foi adicionada.",
  PAGES_READY: "Suas páginas estão prontas para serem processadas.",
  PROCESSING_TITLE: "Estamos preparando seu material",
  PROCESSING_SUBTITLE:
    "Organizando as páginas para transformar seu conteúdo em uma experiência de estudo.",
  COMPLETED_TITLE: "Seu ambiente de estudo está pronto!",
  COMPLETED_SUBTITLE:
    "As páginas foram organizadas e estão prontas para a próxima etapa.",
} as const;

export const PREPARATION_STEPS = [
  {
    id: "receiving",
    title: "Recebendo páginas",
    inProgressMessage: "Recebendo suas páginas...",
    completedMessage: "Páginas recebidas com sucesso",
    startProgress: 0,
    endProgress: 25,
  },
  {
    id: "ordering",
    title: "Organizando a sequência",
    inProgressMessage: "Conferindo a ordem do material...",
    completedMessage: "Sequência validada e organizada",
    startProgress: 25,
    endProgress: 50,
  },
  {
    id: "preparing_content",
    title: "Preparando o conteúdo",
    inProgressMessage: "Preparando a estrutura do estudo...",
    completedMessage: "Estrutura do conteúdo pronta",
    startProgress: 50,
    endProgress: 75,
  },
  {
    id: "building_workspace",
    title: "Montando seu ambiente de estudo",
    inProgressMessage: "Quase tudo pronto...",
    completedMessage: "Ambiente de estudo montado",
    startProgress: 75,
    endProgress: 100,
  },
] as const;
