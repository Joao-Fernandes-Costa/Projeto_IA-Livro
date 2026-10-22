import {
  AIProviderName,
  AISettingsResponse,
  AISettingsUpdateRequest,
  AIProviderDetailConfig,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport } from "./provider";
import { SecretStore } from "@/lib/security/secret-store";

/**
 * Armazenamento server-side das configurações de IA do EstudeAI.
 * Inicializa com as variáveis de ambiente (.env) como valores padrão seguros.
 * NUNCA expõe as chaves de API para o frontend.
 */

interface ServerProviderCredential {
  baseUrl?: string;
  model: string;
  apiKey?: string;
  name?: string;
  description: string;
  defaultModel: string;
  defaultBaseUrl?: string;
}

class AISettingsStoreClass {
  private activeProvider: AIProviderName = "mock";
  private activeModel: string = "mock-vision-v1";
  private customProviderName: string = "9Router Proxy";

  // Configurações e credenciais mantidas estritamente no servidor
  private providers: Record<AIProviderName, ServerProviderCredential> = {
    mock: {
      model: "mock-vision-v1",
      description: "Ambiente de simulação para testes e desenvolvimento sem consumo de cota.",
      defaultModel: "mock-vision-v1",
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "qwen2.5vl:3b",
      description: "Execução 100% local, privada e sem custos através do Ollama.",
      defaultModel: "qwen2.5vl:3b",
      defaultBaseUrl: "http://localhost:11434",
    },
    openrouter: {
      baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5",
      apiKey: process.env.OPENROUTER_API_KEY || "",
      description: "Roteamento inteligente com acesso a múltiplos modelos de ponta.",
      defaultModel: "google/gemini-flash-1.5",
      defaultBaseUrl: "https://openrouter.ai/api/v1",
    },
    openai: {
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY || "",
      description: "Modelos oficiais da OpenAI com suporte a visão e alta precisão.",
      defaultModel: "gpt-4o-mini",
      defaultBaseUrl: "https://api.openai.com/v1",
    },
    gemini: {
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      apiKey: process.env.GEMINI_API_KEY || "",
      description: "Modelos multimodais Google AI Studio com leitura nativa de livros e documentos.",
      defaultModel: "gemini-1.5-flash",
    },
    custom: {
      name: process.env.CUSTOM_OPENAI_NAME || "9Router Proxy",
      baseUrl: process.env.CUSTOM_OPENAI_BASE_URL || "",
      model: process.env.CUSTOM_OPENAI_MODEL || "",
      apiKey: process.env.CUSTOM_OPENAI_API_KEY || "",
      description: "Endpoint personalizado compatível com OpenAI (ex: 9Router Proxy, vLLM, LM Studio).",
      defaultModel: "custom-model",
      defaultBaseUrl: "http://localhost:8080/v1",
    },
  };

  constructor() {
    this.initFromEnv();
  }

  private initFromEnv() {
    const envProvider = (process.env.AI_PROVIDER || "mock").toLowerCase() as AIProviderName;
    if (["mock", "ollama", "openrouter", "openai", "gemini", "custom"].includes(envProvider)) {
      this.activeProvider = envProvider;
    }
    this.activeModel = process.env.AI_MODEL || this.providers[this.activeProvider].model;
    if (process.env.CUSTOM_OPENAI_NAME) {
      this.customProviderName = process.env.CUSTOM_OPENAI_NAME;
    }
  }

  /**
   * Retorna os dados seguros para o frontend (NUNCA envia as chaves de API completas)
   */
  public getConfiguration(): AISettingsResponse {
    const activeConf = this.providers[this.activeProvider];
    const supportsVision = checkVisionSupport(this.activeModel);
    const supportsStructuredOutput = checkStructuredOutputSupport(this.activeProvider, this.activeModel);

    const safeProviders: Record<AIProviderName, AIProviderDetailConfig> = {
      mock: {
        model: this.providers.mock.model,
        apiKeyConfigured: true,
        name: "Mock (Simulação)",
        description: this.providers.mock.description,
        defaultModel: this.providers.mock.defaultModel,
      },
      ollama: {
        baseUrl: this.providers.ollama.baseUrl,
        model: this.providers.ollama.model,
        apiKeyConfigured: true, // Ollama não exige API key por padrão
        name: "Ollama Local",
        description: this.providers.ollama.description,
        defaultModel: this.providers.ollama.defaultModel,
        defaultBaseUrl: this.providers.ollama.defaultBaseUrl,
      },
      openrouter: {
        baseUrl: this.providers.openrouter.baseUrl,
        model: this.providers.openrouter.model,
        apiKeyConfigured: Boolean(
          (this.providers.openrouter.apiKey && this.providers.openrouter.apiKey.trim().length > 0) ||
          SecretStore.getSecretSync("openrouter")?.apiKey
        ),
        name: "OpenRouter",
        description: this.providers.openrouter.description,
        defaultModel: this.providers.openrouter.defaultModel,
        defaultBaseUrl: this.providers.openrouter.defaultBaseUrl,
      },
      openai: {
        baseUrl: this.providers.openai.baseUrl,
        model: this.providers.openai.model,
        apiKeyConfigured: Boolean(this.providers.openai.apiKey && this.providers.openai.apiKey.trim().length > 0),
        name: "OpenAI",
        description: this.providers.openai.description,
        defaultModel: this.providers.openai.defaultModel,
        defaultBaseUrl: this.providers.openai.defaultBaseUrl,
      },
      gemini: {
        model: this.providers.gemini.model,
        apiKeyConfigured: Boolean(this.providers.gemini.apiKey && this.providers.gemini.apiKey.trim().length > 0),
        name: "Google Gemini",
        description: this.providers.gemini.description,
        defaultModel: this.providers.gemini.defaultModel,
      },
      custom: {
        name: this.customProviderName || this.providers.custom.name,
        baseUrl: this.providers.custom.baseUrl,
        model: this.providers.custom.model,
        apiKeyConfigured: Boolean(this.providers.custom.apiKey && this.providers.custom.apiKey.trim().length > 0),
        description: this.providers.custom.description,
        defaultModel: this.providers.custom.defaultModel,
        defaultBaseUrl: this.providers.custom.defaultBaseUrl,
      },
    };

    return {
      activeProvider: this.activeProvider,
      activeModel: this.activeModel,
      baseUrl: activeConf.baseUrl,
      apiKeyConfigured: safeProviders[this.activeProvider].apiKeyConfigured,
      supportsVision,
      supportsStructuredOutput,
      isEnabled: true,
      customProviderName: this.customProviderName,
      providers: safeProviders,
    };
  }

  /**
   * Atualiza as configurações no servidor
   */
  public updateConfiguration(update: AISettingsUpdateRequest): AISettingsResponse {
    if (update.activeProvider && this.providers[update.activeProvider]) {
      this.activeProvider = update.activeProvider;
    }

    if (update.activeModel && update.activeModel.trim()) {
      this.activeModel = update.activeModel.trim();
      this.providers[this.activeProvider].model = this.activeModel;
    }

    if (update.baseUrl !== undefined) {
      this.providers[this.activeProvider].baseUrl = update.baseUrl.trim();
    }

    if (update.customProviderName) {
      this.customProviderName = update.customProviderName.trim();
      this.providers.custom.name = this.customProviderName;
    }

    if (update.apiKey && update.apiKey.trim()) {
      this.providers[this.activeProvider].apiKey = update.apiKey.trim();
    }

    // Atualização de configurações detalhadas por provider se fornecidas
    if (update.providerConfigs) {
      for (const [key, conf] of Object.entries(update.providerConfigs)) {
        const provKey = key as AIProviderName;
        if (this.providers[provKey] && conf) {
          if (conf.model !== undefined) this.providers[provKey].model = conf.model.trim();
          if (conf.baseUrl !== undefined) this.providers[provKey].baseUrl = conf.baseUrl.trim();
          if (conf.apiKey !== undefined) this.providers[provKey].apiKey = conf.apiKey.trim();
          if (provKey === "custom" && conf.name) {
            this.customProviderName = conf.name.trim();
            this.providers.custom.name = this.customProviderName;
          }
        }
      }
    }

    return this.getConfiguration();
  }

  /**
   * Acesso interno (server-only) para criação dos provedores com suas credenciais
   */
  public getProviderCredentials(provider: AIProviderName): {
    apiKey?: string;
    baseUrl?: string;
    model: string;
    customName?: string;
  } {
    const conf = this.providers[provider];

    if (provider === "openrouter") {
      const stored = SecretStore.getSecretSync("openrouter");
      const apiKey = stored?.apiKey || process.env.OPENROUTER_API_KEY || undefined;
      return {
        apiKey: apiKey && apiKey.trim().length > 0 ? apiKey.trim() : undefined,
        baseUrl: stored?.baseUrl || conf.baseUrl,
        model: stored?.model || conf.model,
        customName: undefined,
      };
    }

    return {
      apiKey: conf.apiKey,
      baseUrl: conf.baseUrl,
      model: conf.model,
      customName: provider === "custom" ? this.customProviderName : undefined,
    };
  }

  public getActiveProviderName(): AIProviderName {
    return this.activeProvider;
  }
}

// Singleton no escopo global do servidor
const globalForSettings = globalThis as unknown as {
  aiSettingsStoreInstance?: AISettingsStoreClass;
};

export const AISettingsStore =
  globalForSettings.aiSettingsStoreInstance || new AISettingsStoreClass();

if (process.env.NODE_ENV !== "production") {
  globalForSettings.aiSettingsStoreInstance = AISettingsStore;
}
