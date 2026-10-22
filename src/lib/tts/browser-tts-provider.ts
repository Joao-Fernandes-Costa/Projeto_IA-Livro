import { TTSProvider, TTSProviderName, TTSHealthResult, TTSVoice } from "./tts-provider";

export class BrowserTTSProvider implements TTSProvider {
  public readonly name: TTSProviderName = "browser";

  public async checkHealth(): Promise<TTSHealthResult> {
    return {
      success: true,
      provider: "browser",
      message: "Síntese de voz nativa pronta para execução diretamente no navegador via Web Speech API.",
    };
  }

  public async listVoices(): Promise<TTSVoice[]> {
    return [
      { id: "default-pt-br", name: "Voz padrão do sistema (pt-BR)", lang: "pt-BR" },
      { id: "natural-pt-br", name: "Voz natural em português", lang: "pt-BR" },
    ];
  }
}
