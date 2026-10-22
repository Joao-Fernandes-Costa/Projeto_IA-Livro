import {
  TTSProvider,
  TTSProviderName,
  TTSHealthResult,
  TTSVoice,
  SynthesizeAudioInput,
  SynthesizeAudioResult,
} from "./tts-provider";

export class CustomTTSProvider implements TTSProvider {
  public readonly name: TTSProviderName = "custom";
  private baseUrl: string;
  private apiKey?: string;
  private model: string;

  constructor(baseUrl: string = "http://localhost:8000/v1", apiKey?: string, model: string = "tts-1") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey?.trim();
    this.model = model;
  }

  public async checkHealth(): Promise<TTSHealthResult> {
    if (!this.baseUrl) {
      return {
        success: false,
        provider: "custom",
        message: "Endpoint personalizado de TTS não configurado.",
      };
    }

    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

      const res = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers,
      });

      return {
        success: res.ok,
        provider: "custom",
        message: res.ok
          ? "Endpoint personalizado de TTS online e respondendo."
          : `Endpoint retornou status HTTP ${res.status}.`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        provider: "custom",
        message: `Não foi possível conectar ao endpoint TTS: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async listVoices(): Promise<TTSVoice[]> {
    return [
      { id: "default", name: "Voz padrão do endpoint", lang: "pt-BR" },
      { id: "pt_BR-faber-medium", name: "Piper TTS pt-BR Faber", lang: "pt-BR" },
    ];
  }

  public async synthesize(input: SynthesizeAudioInput): Promise<SynthesizeAudioResult> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

    const res = await fetch(`${this.baseUrl}/audio/speech`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        input: input.text,
        voice: input.voice || "default",
        speed: input.speed || 1.0,
        response_format: input.format || "mp3",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Endpoint TTS personalizado falhou: ${err.slice(0, 200)}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return {
      audioBuffer: Buffer.from(arrayBuffer),
      mimeType: `audio/${input.format || "mp3"}`,
    };
  }
}
