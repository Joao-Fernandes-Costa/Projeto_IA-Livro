import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const runtime = "nodejs";

/**
 * Divide um texto longo em partes menores respeitando pontuação (. ! ? ,)
 * para síntese de voz estável e sem cortes bruscos.
 */
function splitTextIntoChunks(text: string, maxLength = 180): string[] {
  const cleaned = text
    .replace(/[*#_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [];
  if (cleaned.length <= maxLength) return [cleaned];

  const sentences = cleaned.split(/(?<=[.!?;:])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length <= maxLength) {
      current = (current + " " + sentence).trim();
    } else {
      if (current) chunks.push(current);
      if (sentence.length <= maxLength) {
        current = sentence;
      } else {
        // Divide por vírgulas ou palavras caso uma frase isolada seja muito longa
        const words = sentence.split(" ");
        let temp = "";
        for (const w of words) {
          if ((temp + " " + w).trim().length <= maxLength) {
            temp = (temp + " " + w).trim();
          } else {
            if (temp) chunks.push(temp);
            temp = w;
          }
        }
        current = temp;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Camada 1: Síntese Neural Microsoft Edge TTS (pt-BR-FranciscaNeural / pt-BR-AntonioNeural)
 */
async function synthesizeWithEdgeNeural(
  text: string,
  voiceType: "female" | "male"
): Promise<Buffer> {
  const voiceName =
    voiceType === "male" ? "pt-BR-AntonioNeural" : "pt-BR-FranciscaNeural";

  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    voiceName,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );

  const { audioStream } = tts.toStream(text);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      reject(new Error("Edge TTS timeout"));
    }, 15000);

    audioStream.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.from(chunk));
    });

    audioStream.on("end", () => {
      clearTimeout(timeout);
      const result = Buffer.concat(chunks);
      if (result.length > 100) {
        resolve(result);
      } else {
        reject(new Error("Edge TTS returned empty audio buffer"));
      }
    });

    audioStream.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Camada 2 (Fallback HTTPS de alta compatibilidade):
 * Caso a rede institucional bloqueie o WebSocket da Microsoft, gera o MP3
 * em português via HTTPS padrão concatenando os blocos de áudio.
 */
async function synthesizeWithHttpsFallbackMp3(text: string): Promise<Buffer> {
  const textChunks = splitTextIntoChunks(text, 180);
  const audioBuffers: Buffer[] = [];

  for (const chunk of textChunks) {
    const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=pt-BR&q=${encodeURIComponent(
      chunk
    )}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`TTS HTTPS fallback HTTP ${res.status}`);
    }

    const arrayBuf = await res.arrayBuffer();
    audioBuffers.push(Buffer.from(arrayBuf));
  }

  const combined = Buffer.concat(audioBuffers);
  if (combined.length === 0) {
    throw new Error("Empty MP3 buffer from fallback");
  }
  return combined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawText = typeof body?.text === "string" ? body.text.trim() : "";
    const voice: "female" | "male" =
      body?.voice === "male" ? "male" : "female";

    if (!rawText) {
      return NextResponse.json(
        {
          success: false,
          error: "O texto para narração não pode estar vazio.",
        },
        { status: 400 }
      );
    }

    const cleanText = rawText.replace(/[*#_`~]/g, "").trim();

    // Tenta primeiro a Voz Neural Microsoft Edge (Francisca / Antônio)
    try {
      const mp3Buffer = await synthesizeWithEdgeNeural(cleanText, voice);
      return NextResponse.json({
        success: true,
        engine: "edge-neural",
        voiceName:
          voice === "male"
            ? "Antônio Neural (pt-BR)"
            : "Francisca Neural (pt-BR)",
        mimeType: "audio/mpeg",
        audioBase64: mp3Buffer.toString("base64"),
      });
    } catch (edgeErr) {
      console.warn(
        "[TTS] Edge Neural indisponível na rede atual, acionando fallback MP3 HTTPS:",
        edgeErr instanceof Error ? edgeErr.message : edgeErr
      );
    }

    // Fallback automático em MP3 via HTTPS (nunca bloqueado por firewall de campus)
    const fallbackBuffer = await synthesizeWithHttpsFallbackMp3(cleanText);
    return NextResponse.json({
      success: true,
      engine: "https-mp3",
      voiceName: "Voz Português (pt-BR)",
      mimeType: "audio/mpeg",
      audioBase64: fallbackBuffer.toString("base64"),
    });
  } catch (error: unknown) {
    console.error("[TTS API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível sintetizar o áudio no servidor.",
      },
      { status: 500 }
    );
  }
}
