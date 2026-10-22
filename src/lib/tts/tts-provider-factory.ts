import { TTSProvider, TTSProviderName } from "./tts-provider";
import { BrowserTTSProvider } from "./browser-tts-provider";
import { OpenAITTSProvider } from "./openai-tts-provider";
import { CustomTTSProvider } from "./custom-tts-provider";
import { TTSSettingsStore } from "./tts-settings-store";

export class TTSProviderFactory {
  public static getProvider(providerName?: TTSProviderName): TTSProvider {
    const target = providerName || TTSSettingsStore.getConfiguration().provider;
    const creds = TTSSettingsStore.getCredentials();

    switch (target) {
      case "openai":
        return new OpenAITTSProvider(creds.apiKey, creds.baseUrl || "https://api.openai.com/v1");

      case "custom":
        return new CustomTTSProvider(creds.baseUrl || "http://localhost:8000/v1", creds.apiKey);

      case "local":
        return new CustomTTSProvider(creds.baseUrl || "http://localhost:8000/v1", undefined, "piper");

      case "browser":
      default:
        return new BrowserTTSProvider();
    }
  }
}
