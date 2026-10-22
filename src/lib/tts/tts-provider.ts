export type TTSProviderName = "browser" | "openai" | "custom" | "local";

export interface TTSVoice {
  id: string;
  name: string;
  lang: string;
  gender?: "male" | "female" | "neutral";
}

export interface SynthesizeAudioInput {
  text: string;
  voice?: string;
  speed?: number; // 0.5 a 2.0
  format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
}

export interface SynthesizeAudioResult {
  audioUrl?: string;
  audioBuffer?: Buffer;
  mimeType?: string;
  durationSeconds?: number;
}

export interface TTSHealthResult {
  success: boolean;
  provider: TTSProviderName;
  message: string;
}

export interface TTSConfiguration {
  provider: TTSProviderName;
  voice: string;
  speed: number;
  format: string;
  apiKeyConfigured: boolean;
  baseUrl?: string;
}

export interface TTSProvider {
  readonly name: TTSProviderName;
  checkHealth(): Promise<TTSHealthResult>;
  listVoices?(): Promise<TTSVoice[]>;
  synthesize?(input: SynthesizeAudioInput): Promise<SynthesizeAudioResult>;
}
