import {
  TTSProvider,
  TTSProviderName,
  TTSHealthResult,
  TTSVoice,
  SynthesizeAudioInput,
  SynthesizeAudioResult,
} from "./tts-provider";

export class OpenAITTSProvider implements TTSProvider {
  public readonly name: TTSProviderName = "openai";
  private apiKey?: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey?: string, baseUrl: string = "https://api.openai.com/v1", model: string = "tts-1") {
    this.apiKey = apiKey?.trim();
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.model = model;
  }

  public async checkHealth(): Promise<TTSHealthResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: "openai",
        message: "Chave de API específica para OpenAI TTS não configurada no painel de Áudio.",
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!res.ok) {
        return {
          success: false,
          provider: "openai",
          message: `Falha na autenticação do OpenAI TTS (HTTP ${res.status}). Verifique a chave de API de áudio.`,
        };
      }

      return {
        success: true,
        provider: "openai",
        message: "OpenAI TTS conectado e pronto para sintetizar narrações em áudio.",
      };
    } catch (err: unknown) {
      return {
        success: false,
        provider: "openai",
        message: `Erro ao conectar com OpenAI TTS: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async listVoices(): Promise<TTSVoice[]> {
    return [
      { id: "alloy", name: "Alloy (Equilibrada e neutra)", lang: "pt-BR", gender: "neutral" },
      { id: "echo", name: "Echo (Voz masculina clara)", lang: "pt-BR", gender: "male" },
      { id: "fable", name: "Fable (Expressiva e narrativa)", lang: "pt-BR", gender: "neutral" },
      { id: "onyx", name: "Onyx (Voz masculina grave)", lang: "pt-BR", gender: "male" },
      { id: "nova", name: "Nova (Voz feminina natural e enérgica)", lang: "pt-BR", gender: "female" },
      { id: "shimmer", name: "Shimmer (Voz feminina suave)", lang: "pt-BR", gender: "female" },
    ];
  }

  public async synthesize(input: SynthesizeAudioInput): Promise<SynthesizeAudioResult> {
    if (!this.apiKey) {
      throw new Error("Chave de API do OpenAI TTS não configurada.");
    }

    const voice = input.voice || "nova";
    const speed = input.speed || 1.0;
    const format = input.format || "mp3";

    const res = await fetch(`${this.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: input.text,
        voice,
        speed,
        response_format: format,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI TTS falhou (HTTP ${res.status}): ${errText.slice(0, 200)}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer: buffer,
      mimeType: `audio/${format}`,
    };
  }
}
