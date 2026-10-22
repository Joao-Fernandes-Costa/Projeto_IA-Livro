import { TTSProviderName, TTSConfiguration } from "./tts-provider";
import { SecretStore } from "@/lib/security/secret-store";

interface ServerTTSState {
  provider: TTSProviderName;
  voice: string;
  speed: number;
  format: string;
  apiKey?: string;
  baseUrl?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __estudeai_tts_settings__: ServerTTSState | undefined;
}

const defaultState: ServerTTSState = {
  provider: (process.env.TTS_PROVIDER as TTSProviderName) || "browser",
  voice: process.env.TTS_VOICE || "default-pt-br",
  speed: 1.0,
  format: "mp3",
  apiKey: process.env.TTS_OPENAI_API_KEY || "",
  baseUrl: process.env.TTS_BASE_URL || "",
};

const ttsState: ServerTTSState = globalThis.__estudeai_tts_settings__ ?? { ...defaultState };

if (process.env.NODE_ENV !== "production") {
  globalThis.__estudeai_tts_settings__ = ttsState;
}

export class TTSSettingsStore {
  public static getConfiguration(): TTSConfiguration {
    // Busca segredo armazenado especificamente para TTS caso não esteja na memória
    let apiKeyPresent = Boolean(ttsState.apiKey && ttsState.apiKey.trim().length > 0);
    if (!apiKeyPresent) {
      const stored = SecretStore.getSecretSync("tts_openai");
      if (stored?.apiKey) apiKeyPresent = true;
    }

    return {
      provider: ttsState.provider,
      voice: ttsState.voice,
      speed: ttsState.speed,
      format: ttsState.format,
      apiKeyConfigured: apiKeyPresent,
      baseUrl: ttsState.baseUrl,
    };
  }

  public static getCredentials(): ServerTTSState {
    let apiKey = ttsState.apiKey;
    if (!apiKey) {
      const stored = SecretStore.getSecretSync("tts_openai");
      if (stored?.apiKey) apiKey = stored.apiKey;
    }

    return {
      ...ttsState,
      apiKey,
    };
  }

  public static updateConfiguration(update: Partial<TTSConfiguration> & { apiKey?: string }): TTSConfiguration {
    if (update.provider) ttsState.provider = update.provider;
    if (update.voice) ttsState.voice = update.voice;
    if (update.speed !== undefined) ttsState.speed = Number(update.speed);
    if (update.format) ttsState.format = update.format;
    if (update.baseUrl !== undefined) ttsState.baseUrl = update.baseUrl.trim();

    if (update.apiKey !== undefined && update.apiKey.trim()) {
      ttsState.apiKey = update.apiKey.trim();
      SecretStore.saveSecretSync("tts_openai", {
        apiKey: ttsState.apiKey,
        baseUrl: ttsState.baseUrl,
      });
    }

    return this.getConfiguration();
  }
}
