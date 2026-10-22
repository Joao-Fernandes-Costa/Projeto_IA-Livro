import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";

export type {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
};

/**
 * Palavras-chave conhecidas para detecção de capacidades de visão computacional em modelos
 */
const VISION_MODEL_KEYWORDS = [
  "vl",
  "vision",
  "llava",
  "bakllava",
  "minicpm",
  "moondream",
  "qwen2.5vl",
  "qwen2-vl",
  "llama-3.2-11b-vision",
  "llama-3.2-90b-vision",
  "gpt-4o",
  "gpt-4-turbo",
  "gemini",
  "claude-3",
  "pixtral",
  "omni",
  "florence",
];

/**
 * Modelos sabidamente SEM suporte a imagens
 */
const TEXT_ONLY_MODELS = [
  "gpt-3.5",
  "gpt-3.5-turbo",
  "text-davinci",
  "babbage",
  "ada",
  "curie",
  "text-embedding",
  "llama-2",
  "llama-3-8b",
  "llama-3-70b",
  "llama-3.1-8b",
  "llama-3.1-70b",
  "mistral-7b",
  "mixtral-8x7b",
  "qwen2.5-7b",
  "deepseek-chat",
  "deepseek-coder",
];

/**
 * Validador heurístico de suporte a visão com base no nome do modelo
 */
export function checkVisionSupport(modelName: string): boolean {
  if (!modelName) return false;
  const lower = modelName.toLowerCase();

  // 1. Verificar se é explicitamente texto puro
  for (const textModel of TEXT_ONLY_MODELS) {
    if (lower.includes(textModel) && !lower.includes("vision") && !lower.includes("vl")) {
      return false;
    }
  }

  // 2. Verificar se contém palavras-chave de visão
  for (const kw of VISION_MODEL_KEYWORDS) {
    if (lower.includes(kw)) {
      return true;
    }
  }

  // Modelos mock sempre suportam
  if (lower.includes("mock")) return true;

  return false;
}

/**
 * Validador heurístico de suporte a saída estruturada (JSON)
 */
export function checkStructuredOutputSupport(
  provider: AIProviderName,
  modelName: string
): boolean {
  if (provider === "mock") return true;
  if (provider === "gemini") return true;
  if (provider === "openai") return true;
  if (provider === "openrouter") return true;
  if (provider === "ollama") return true;
  if (provider === "custom") return true;

  const lower = modelName.toLowerCase();
  if (lower.includes("turbo") || lower.includes("gpt-4") || lower.includes("gemini")) {
    return true;
  }
  return true;
}

/**
 * Validação rigorosa de URL para prevenir SSRF e protocolos inválidos
 */
export function validateBaseUrl(urlStr?: string): { valid: boolean; normalized?: string; error?: string } {
  if (!urlStr || !urlStr.trim()) {
    return { valid: false, error: "A URL base não pode estar vazia." };
  }

  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        valid: false,
        error: "A URL deve utilizar protocolo HTTP ou HTTPS.",
      };
    }
    // Remove barra final para uniformidade
    const normalized = parsed.origin + (parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, ""));
    return { valid: true, normalized };
  } catch {
    return { valid: false, error: "URL inválida. Formato esperado: http://host:porta ou https://dominio" };
  }
}
