export type RotationDegree = 0 | 90 | 180 | 270;

export interface StudyPage {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeBytes: number;
  rotation: number;
  addedAt: number;
}

export type BookPageImage = StudyPage;

export type StudyProcessingState =
  | "idle"
  | "uploading"
  | "analyzing"
  | "generating_lecture"
  | "generating_quiz"
  | "completed"
  | "error";

export interface StudyMetrics {
  totalPages: number;
  totalSizeBytes: number;
  estimatedWords: number;
  estimatedTokens: number;
  memoryPercentage: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  pageReference?: number;
}

export interface LectureSlide {
  pageNumber: number;
  title: string;
  content: string;
  keyPoints: string[];
}

export interface StudyLecture {
  title: string;
  summary: string;
  script: string;
  slides: LectureSlide[];
  audioUrl?: string;
}

export interface AIStudyResult {
  studyTitle: string;
  pageCount: number;
  extractedMarkdown: string;
  lecture: StudyLecture;
  quiz: QuizQuestion[];
  processedAt: string;
}

export interface ProcessingStatus {
  state: StudyProcessingState;
  progress: number;
  message?: string;
  error?: string;
}

export interface StudySession {
  id: string;
  title: string;
  pages: StudyPage[];
  status: ProcessingStatus;
  result?: AIStudyResult;
  createdAt: number;
  updatedAt: number;
}

export type HomeViewMode = "composer" | "processing" | "workspace_preview";

export type PreparationStepState = "waiting" | "in_progress" | "completed";

export interface PreparationStep {
  id: string;
  title: string;
  inProgressMessage: string;
  completedMessage: string;
  startProgress: number;
  endProgress: number;
}
