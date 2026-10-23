import fs from "fs";
import path from "path";
import {
  AIProviderName,
  AISettingsResponse,
  AISettingsUpdateRequest,
  AIProviderDetailConfig,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport } from "./provider";
import { SecretStore } from "@/lib/security/secret-store";
import { TTSSettingsStore } from "@/lib/tts/tts-settings-store";
import { AISafeLogger } from "./safe-logger";

/**
 * Armazenamento server-side seguro e persistente das configurações de IA do EstudeAI.
 * 
 * Ordem de resolução da AIProviderFactory / AISettingsStore:
 * 1. Configuração persistida pelo administrador (.data/ai-config.json);
 * 2. Variáveis de ambiente como configuração inicial (AI_PROVIDER);
 * 3. OpenRouter como padrão final de produção (nunca mock).
 * 
 * NUNCA expõe as chaves de API completas para o frontend.
 */

const CONFIG_DIR = path.join(process.cwd(), ".data");
const CONFIG_FILE = path.join(CONFIG_DIR, "ai-config.json");

interface ServerProviderCredential {
  baseUrl?: string;
  model: string;
  apiKey?: string;
  name?: string;
  description: string;
  defaultModel: string;
  defaultBaseUrl?: string;
}

export interface PersistedAIConfig {
  activeProvider: AIProviderName;
  activeModel?: string;
  baseUrl?: string;
  customProviderName?: string;
  providerConfigs?: Partial<Record<AIProviderName, {
    model?: string;
    baseUrl?: string;
    name?: string;
  }>>;
  lastUpdated?: string;
  updatedBy?: string;
}

function readPersistedConfig(): PersistedAIConfig | null {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8").trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAIConfig;
    if (parsed && parsed.activeProvider) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error("[AISettingsStore] Falha ao ler configuração persistida:", err);
    return null;
  }
}

function writePersistedConfig(config: PersistedAIConfig): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch (err) {
    console.error("[AISettingsStore] Falha ao persistir configuração no disco:", err);
  }
}

class AISettingsStoreClass {
  // Provedor padrão inicial: openrouter (nunca mock em produção)
  private activeProvider: AIProviderName = "openrouter";
  private activeModel: string = "google/gemini-flash-1.5";
  private customProviderName: string = "9Router Proxy";
  private lastUpdated?: string;
  private updatedBy?: string;

  // Configurações e credenciais mantidas estritamente no servidor
  private providers: Record<AIProviderName, ServerProviderCredential> = {
    openrouter: {
      baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5",
      apiKey: process.env.OPENROUTER_API_KEY || "",
      description: "Roteamento inteligente com acesso a múltiplos modelos de ponta.",
      defaultModel: "google/gemini-flash-1.5",
      defaultBaseUrl: "https://openrouter.ai/api/v1",
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "qwen2.5vl:3b",
      description: "Execução 100% local, privada e sem custos através do Ollama.",
      defaultModel: "qwen2.5vl:3b",
      defaultBaseUrl: "http://localhost:11434",
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
    mock: {
      model: "mock-vision-v1",
      description: "Ambiente de simulação para testes e desenvolvimento sem consumo de cota.",
      defaultModel: "mock-vision-v1",
    },
  };

  constructor() {
    this.init();
  }

  private init() {
    // 1. Tenta carregar configuração persistida pelo administrador
    const persisted = readPersistedConfig();
    if (persisted && persisted.activeProvider) {
      this.activeProvider = persisted.activeProvider;
      if (persisted.activeModel) {
        this.activeModel = persisted.activeModel;
        if (this.providers[this.activeProvider]) {
          this.providers[this.activeProvider].model = persisted.activeModel;
        }
      } else if (this.providers[this.activeProvider]) {
        this.activeModel = this.providers[this.activeProvider].model;
      }

      if (persisted.baseUrl && this.providers[this.activeProvider]) {
        this.providers[this.activeProvider].baseUrl = persisted.baseUrl;
      }
      if (persisted.customProviderName) {
        this.customProviderName = persisted.customProviderName;
      }
      if (persisted.providerConfigs) {
        for (const [key, conf] of Object.entries(persisted.providerConfigs)) {
          const provKey = key as AIProviderName;
          if (this.providers[provKey] && conf) {
            if (conf.model) this.providers[provKey].model = conf.model;
            if (conf.baseUrl) this.providers[provKey].baseUrl = conf.baseUrl;
          }
        }
      }
      this.lastUpdated = persisted.lastUpdated;
      this.updatedBy = persisted.updatedBy;
      return;
    }

    // 2. Variáveis de ambiente como configuração inicial
    const envProvider = process.env.AI_PROVIDER?.trim().toLowerCase() as AIProviderName;
    if (["mock", "ollama", "openrouter", "openai", "gemini", "custom"].includes(envProvider)) {
      this.activeProvider = envProvider;
    } else {
      // 3. OpenRouter como padrão final
      this.activeProvider = "openrouter";
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
      ollama: {
        baseUrl: this.providers.ollama.baseUrl,
        model: this.providers.ollama.model,
        apiKeyConfigured: true,
        name: "Ollama Local",
        description: this.providers.ollama.description,
        defaultModel: this.providers.ollama.defaultModel,
        defaultBaseUrl: this.providers.ollama.defaultBaseUrl,
      },
      openai: {
        baseUrl: this.providers.openai.baseUrl,
        model: this.providers.openai.model,
        apiKeyConfigured: Boolean(
          (this.providers.openai.apiKey && this.providers.openai.apiKey.trim().length > 0) ||
          SecretStore.getSecretSync("openai")?.apiKey
        ),
        name: "OpenAI",
        description: this.providers.openai.description,
        defaultModel: this.providers.openai.defaultModel,
        defaultBaseUrl: this.providers.openai.defaultBaseUrl,
      },
      gemini: {
        model: this.providers.gemini.model,
        apiKeyConfigured: Boolean(
          (this.providers.gemini.apiKey && this.providers.gemini.apiKey.trim().length > 0) ||
          SecretStore.getSecretSync("gemini")?.apiKey
        ),
        name: "Google Gemini",
        description: this.providers.gemini.description,
        defaultModel: this.providers.gemini.defaultModel,
      },
      custom: {
        name: this.customProviderName || this.providers.custom.name,
        baseUrl: this.providers.custom.baseUrl,
        model: this.providers.custom.model,
        apiKeyConfigured: Boolean(
          (this.providers.custom.apiKey && this.providers.custom.apiKey.trim().length > 0) ||
          SecretStore.getSecretSync("custom")?.apiKey
        ),
        description: this.providers.custom.description,
        defaultModel: this.providers.custom.defaultModel,
        defaultBaseUrl: this.providers.custom.defaultBaseUrl,
      },
      mock: {
        model: this.providers.mock.model,
        apiKeyConfigured: true,
        name: "Mock (Simulação)",
        description: this.providers.mock.description,
        defaultModel: this.providers.mock.defaultModel,
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
      tts: TTSSettingsStore.getConfiguration(),
      lastUpdated: this.lastUpdated,
      updatedBy: this.updatedBy,
    };
  }

  /**
   * Atualiza e persiste as configurações no servidor de forma segura.
   */
  public updateConfiguration(
    update: AISettingsUpdateRequest,
    updatedBy: string = "admin"
  ): AISettingsResponse {
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
      const trimmedKey = update.apiKey.trim();
      this.providers[this.activeProvider].apiKey = trimmedKey;
      SecretStore.saveSecretSync(this.activeProvider, {
        apiKey: trimmedKey,
        model: this.activeModel,
        baseUrl: this.providers[this.activeProvider].baseUrl,
      });
    }

    // Atualização de configurações detalhadas por provider se fornecidas
    if (update.providerConfigs) {
      for (const [key, conf] of Object.entries(update.providerConfigs)) {
        const provKey = key as AIProviderName;
        if (this.providers[provKey] && conf) {
          if (conf.model !== undefined && conf.model.trim()) {
            this.providers[provKey].model = conf.model.trim();
          }
          if (conf.baseUrl !== undefined) {
            this.providers[provKey].baseUrl = conf.baseUrl.trim();
          }
          if (conf.apiKey && conf.apiKey.trim()) {
            const keyTrimmed = conf.apiKey.trim();
            this.providers[provKey].apiKey = keyTrimmed;
            SecretStore.saveSecretSync(provKey, {
              apiKey: keyTrimmed,
              model: this.providers[provKey].model,
              baseUrl: this.providers[provKey].baseUrl,
            });
          }
          if (provKey === "custom" && conf.name) {
            this.customProviderName = conf.name.trim();
            this.providers.custom.name = this.customProviderName;
          }
        }
      }
    }

    if (update.tts) {
      TTSSettingsStore.updateConfiguration(update.tts);
    }

    // Persiste no arquivo seguro em disco
    this.lastUpdated = new Date().toISOString();
    this.updatedBy = updatedBy;

    const providerConfigsToSave: Partial<Record<AIProviderName, { model?: string; baseUrl?: string; name?: string }>> = {};
    for (const [pName, pConf] of Object.entries(this.providers)) {
      providerConfigsToSave[pName as AIProviderName] = {
        model: pConf.model,
        baseUrl: pConf.baseUrl,
        name: pConf.name,
      };
    }

    writePersistedConfig({
      activeProvider: this.activeProvider,
      activeModel: this.activeModel,
      baseUrl: this.providers[this.activeProvider].baseUrl,
      customProviderName: this.customProviderName,
      providerConfigs: providerConfigsToSave,
      lastUpdated: this.lastUpdated,
      updatedBy: this.updatedBy,
    });

    // Auditoria segura no servidor
    AISafeLogger.logConfigChange({
      user: this.updatedBy,
      activeProvider: this.activeProvider,
      activeModel: this.activeModel,
      timestamp: this.lastUpdated,
    });

    return this.getConfiguration();
  }

  /**
   * Acesso interno (server-only) para criação dos provedores com suas credenciais.
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
      const apiKey = stored?.apiKey || this.providers.openrouter.apiKey || process.env.OPENROUTER_API_KEY || undefined;
      return {
        apiKey: apiKey && apiKey.trim().length > 0 ? apiKey.trim() : undefined,
        baseUrl: stored?.baseUrl || conf.baseUrl,
        model: stored?.model || conf.model,
        customName: undefined,
      };
    }

    if (provider === "openai" || provider === "gemini" || provider === "custom") {
      const stored = SecretStore.getSecretSync(provider);
      const apiKey = stored?.apiKey || conf.apiKey || undefined;
      return {
        apiKey: apiKey && apiKey.trim().length > 0 ? apiKey.trim() : undefined,
        baseUrl: stored?.baseUrl || conf.baseUrl,
        model: stored?.model || conf.model,
        customName: provider === "custom" ? this.customProviderName : undefined,
      };
    }

    return {
      apiKey: conf.apiKey,
      baseUrl: conf.baseUrl,
      model: conf.model,
      customName: undefined,
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
