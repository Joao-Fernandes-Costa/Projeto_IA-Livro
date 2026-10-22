import { AIStudyResult } from "./study";
import type { PageAnalysis, PageSection, PageProcessingError, StudyAnalysis } from "@/lib/ai/schema";
import type { QuizGenerationServer } from "@/lib/quiz/schema";

export type { PageAnalysis, PageSection, PageProcessingError, StudyAnalysis };

export type AIProviderName =
  | "mock"
  | "ollama"
  | "openrouter"
  | "openai"
  | "gemini"
  | "custom";

export interface AIHealthResult {
  success: boolean;
  provider: AIProviderName;
  model: string;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  message: string;
}

export interface AnalyzePageInput {
  pageNumber: number;
  imageBuffer?: Buffer;
  imageBase64?: string;
  mimeType?: string;
  fileName?: string;
  studyTitle?: string;
}

export type AnalyzePageResult = PageAnalysis;

export interface AIProvider {
  readonly name: AIProviderName;
  checkHealth(): Promise<AIHealthResult>;
  analyzePage(input: AnalyzePageInput): Promise<AnalyzePageResult>;
  analyzePages?(request: AIAnalysisRequest): Promise<AIStudyResult>;
  generateQuiz?(studyAnalysis: StudyAnalysis): Promise<QuizGenerationServer>;
}

export interface AIConfiguration {
  activeProvider: AIProviderName;
  activeModel: string;
  baseUrl?: string;
  apiKeyConfigured: boolean;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  isEnabled: boolean;
  customProviderName?: string;
}

export interface AIAnalysisRequest {
  title?: string;
  pages: Array<{
    id: string;
    name: string;
    pageNumber: number;
    base64Data?: string;
    mimeType?: string;
    rotation?: number;
  }>;
}

export interface IAIProvider {
  readonly providerName: string;
  analyzePages(request: AIAnalysisRequest): Promise<AIStudyResult>;
}

export interface AIProviderDetailConfig {
  baseUrl?: string;
  model: string;
  apiKeyConfigured: boolean;
  name?: string;
  description?: string;
  defaultModel?: string;
  defaultBaseUrl?: string;
}

export interface AISettingsResponse extends AIConfiguration {
  providers: Record<AIProviderName, AIProviderDetailConfig>;
}

export interface AISettingsUpdateRequest {
  activeProvider?: AIProviderName;
  activeModel?: string;
  baseUrl?: string;
  customProviderName?: string;
  apiKey?: string;
  providerConfigs?: Partial<Record<AIProviderName, Partial<AIProviderDetailConfig> & { apiKey?: string }>>;
}

export interface AITestRequest {
  provider: AIProviderName;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}
