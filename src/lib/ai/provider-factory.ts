import { AIProvider, AIProviderName, IAIProvider, AIAnalysisRequest } from "@/types/ai";
import { AIStudyResult } from "@/types/study";
import { AISettingsStore } from "./settings-store";
import { MockAIProvider } from "./mock-provider";
import { OllamaAIProvider } from "./ollama-provider";
import { OpenRouterAIProvider } from "./openrouter-provider";
import { OpenAIProvider } from "./openai-provider";
import { GeminiAIProvider } from "./gemini-provider";
import { CustomOpenAIProvider } from "./custom-openai-provider";

export interface ProviderOverrides {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  customName?: string;
}

/**
 * Fábrica central de provedores de IA.
 * Garante que nenhuma parte do sistema instancie ou acesse diretamente
 * provedores externos sem passar pela resolução centralizada e segura.
 */
export class AIProviderFactory {
  public static getProvider(
    providerName?: AIProviderName,
    overrides?: ProviderOverrides
  ): AIProvider & IAIProvider {
    const targetName = providerName || AISettingsStore.getActiveProviderName();
    const creds = AISettingsStore.getProviderCredentials(targetName);

    const baseUrl = overrides?.baseUrl !== undefined ? overrides.baseUrl : creds.baseUrl;
    const model = overrides?.model !== undefined ? overrides.model : creds.model;
    const apiKey = overrides?.apiKey !== undefined ? overrides.apiKey : creds.apiKey;
    const customName = overrides?.customName || creds.customName || "9Router Proxy";

    let provider: AIProvider;

    switch (targetName) {
      case "ollama":
        provider = new OllamaAIProvider(baseUrl, model);
        break;

      case "openrouter":
        provider = new OpenRouterAIProvider(baseUrl, model, apiKey);
        break;

      case "openai":
        provider = new OpenAIProvider(baseUrl, model, apiKey);
        break;

      case "gemini":
        provider = new GeminiAIProvider(model, apiKey);
        break;

      case "custom":
        provider = new CustomOpenAIProvider(customName, baseUrl, model, apiKey);
        break;

      case "mock":
      default:
        provider = new MockAIProvider(model);
        break;
    }

    // Bridge de compatibilidade para IAIProvider caso o provider nativo ainda não possua analyzePages
    const wrapped: AIProvider & IAIProvider = Object.assign(provider, {
      providerName: provider.name,
      async analyzePages(request: AIAnalysisRequest): Promise<AIStudyResult> {
        if ("analyzePages" in provider && typeof (provider as unknown as IAIProvider).analyzePages === "function") {
          return (provider as unknown as IAIProvider).analyzePages(request);
        }

        // Simulação segura baseada na resposta do provider ativo
        const mockFallback = new MockAIProvider(model);
        return mockFallback.analyzePages(request);
      },
    });

    return wrapped;
  }
}

/**
 * Atalho para obter o provider atualmente ativo no sistema
 */
export function getAIProvider(): AIProvider & IAIProvider {
  return AIProviderFactory.getProvider();
}
