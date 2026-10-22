import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport } from "./provider";
import { MULTIMODAL_PAGE_READING_PROMPT, parseAndValidatePageAnalysis } from "./schema";

export class GeminiAIProvider implements AIProvider {
  public readonly name: AIProviderName = "gemini";
  private model: string;
  private apiKey?: string;

  constructor(model: string = "gemini-1.5-flash", apiKey?: string) {
    this.model = model.trim() || "gemini-1.5-flash";
    this.apiKey = apiKey?.trim();
  }

  public async checkHealth(): Promise<AIHealthResult> {
    const supportsVision = checkVisionSupport(this.model);
    const supportsStructuredOutput = checkStructuredOutputSupport("gemini", this.model);

    if (!this.apiKey) {
      return {
        success: false,
        provider: "gemini",
        model: this.model,
        supportsVision,
        supportsStructuredOutput,
        message: "Chave de API do Google Gemini não configurada. Defina GEMINI_API_KEY no .env ou informe no painel.",
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.apiKey)}`;
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 400 || res.status === 403) {
        return {
          success: false,
          provider: "gemini",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: "Chave de API do Google Gemini inválida ou não autorizada.",
        };
      }

      if (res.status === 429) {
        return {
          success: false,
          provider: "gemini",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: "Limite de requisições excedido no Google AI Studio (Cota 429).",
        };
      }

      if (!res.ok) {
        return {
          success: false,
          provider: "gemini",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: `Google Gemini respondeu com status ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      const modelsList: Array<{ name?: string }> = Array.isArray(data.models) ? data.models : [];
      const cleanModelName = this.model.replace(/^models\//, "").toLowerCase();

      const modelExists = modelsList.some((m) =>
        (m.name || "").toLowerCase().includes(cleanModelName)
      );

      if (!modelExists && modelsList.length > 0) {
        return {
          success: true,
          provider: "gemini",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: `Conexão autenticada no Google AI Studio. Nota: certifique-se de que o modelo "${this.model}" está disponível para sua chave.`,
        };
      }

      return {
        success: true,
        provider: "gemini",
        model: this.model,
        supportsVision: true,
        supportsStructuredOutput: true,
        message: `Google Gemini conectado e autenticado! Modelo "${this.model}" pronto para leitura multimodal de páginas.`,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return {
          success: false,
          provider: "gemini",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: "Tempo limite esgotado ao conectar aos servidores do Google Gemini.",
        };
      }

      return {
        success: false,
        provider: "gemini",
        model: this.model,
        supportsVision,
        supportsStructuredOutput,
        message: `Falha de conexão com a API do Google Gemini: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async analyzePage(input: AnalyzePageInput): Promise<AnalyzePageResult> {
    if (!this.apiKey) {
      const err = new Error("Chave de API do Google Gemini não configurada.");
      (err as unknown as { code: string }).code = "API_KEY_MISSING";
      throw err;
    }

    const mime = input.mimeType || "image/jpeg";
    const rawBase64 = input.imageBase64
      ? input.imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "")
      : input.imageBuffer
      ? input.imageBuffer.toString("base64")
      : "";

    if (!rawBase64 || rawBase64.length < 50) {
      throw new Error("Dados da imagem inválidos ou corrompidos para leitura no Gemini.");
    }

    const cleanModel = this.model.replace(/^models\//, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(
      this.apiKey
    )}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${MULTIMODAL_PAGE_READING_PROMPT}\n\nPágina atual do livro: ${input.pageNumber}`,
                },
                {
                  inline_data: {
                    mime_type: mime,
                    data: rawBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const errMessage = errorJson?.error?.message || res.statusText;

        if (
          res.status === 400 &&
          (errMessage.toLowerCase().includes("inline_data") ||
            errMessage.toLowerCase().includes("vision") ||
            errMessage.toLowerCase().includes("image"))
        ) {
          const err = new Error("O modelo selecionado não possui suporte para leitura de imagens.");
          (err as unknown as { code: string }).code = "VISION_NOT_SUPPORTED";
          throw err;
        }

        if (res.status === 400 || res.status === 403) {
          const err = new Error("Chave de API do Google Gemini inválida ou não autorizada.");
          (err as unknown as { code: string }).code = "API_KEY_INVALID";
          throw err;
        }

        if (res.status === 429) {
          const err = new Error("Limite de cota excedido no Google AI Studio (Erro 429).");
          (err as unknown as { code: string }).code = "RATE_LIMIT_EXCEEDED";
          throw err;
        }

        throw new Error(`Google Gemini erro HTTP ${res.status}: ${errMessage}`);
      }

      const json = await res.json();
      const content =
        json.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return parseAndValidatePageAnalysis(content, input.pageNumber);
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutErr = new Error("A leitura da página excedeu o tempo máximo no Google Gemini.");
        (timeoutErr as unknown as { code: string }).code = "MODEL_TIMEOUT";
        throw timeoutErr;
      }
      throw err;
    }
  }
}
