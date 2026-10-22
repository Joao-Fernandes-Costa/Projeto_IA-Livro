import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport, validateBaseUrl } from "./provider";
import { MULTIMODAL_PAGE_READING_PROMPT } from "./schema";
import { parseOpenAICompatibleResponse } from "./response-parser";

export class OpenAIProvider implements AIProvider {
  public readonly name: AIProviderName = "openai";
  private baseUrl: string;
  private model: string;
  private apiKey?: string;

  constructor(
    baseUrl: string = "https://api.openai.com/v1",
    model: string = "gpt-4o-mini",
    apiKey?: string
  ) {
    const validated = validateBaseUrl(baseUrl);
    this.baseUrl = validated.valid && validated.normalized ? validated.normalized : baseUrl;
    this.model = model.trim() || "gpt-4o-mini";
    this.apiKey = apiKey?.trim();
  }

  public async checkHealth(): Promise<AIHealthResult> {
    const supportsVision = checkVisionSupport(this.model);
    const supportsStructuredOutput = checkStructuredOutputSupport("openai", this.model);

    if (!this.apiKey) {
      return {
        success: false,
        provider: "openai",
        model: this.model,
        supportsVision,
        supportsStructuredOutput,
        message: "Chave de API da OpenAI não configurada. Defina OPENAI_API_KEY no .env ou informe no painel.",
      };
    }

    const urlValidation = validateBaseUrl(this.baseUrl);
    if (!urlValidation.valid) {
      return {
        success: false,
        provider: "openai",
        model: this.model,
        supportsVision: false,
        supportsStructuredOutput: false,
        message: urlValidation.error || "URL base da OpenAI inválida.",
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 401) {
        return {
          success: false,
          provider: "openai",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: "Chave de API da OpenAI inválida ou não autorizada.",
        };
      }

      if (res.status === 429) {
        return {
          success: false,
          provider: "openai",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: "Limite de taxa ou créditos esgotados na sua conta OpenAI (Erro 429).",
        };
      }

      if (!supportsVision) {
        return {
          success: true,
          provider: "openai",
          model: this.model,
          supportsVision: false,
          supportsStructuredOutput,
          message: `Conexão autenticada com sucesso! Porém o modelo "${this.model}" não possui suporte a imagens (visão computacional).`,
        };
      }

      return {
        success: true,
        provider: "openai",
        model: this.model,
        supportsVision: true,
        supportsStructuredOutput,
        message: `OpenAI conectada com sucesso! Modelo "${this.model}" pronto para leitura de páginas de livros.`,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return {
          success: false,
          provider: "openai",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: "Tempo limite esgotado ao tentar comunicar com a API da OpenAI.",
        };
      }

      return {
        success: false,
        provider: "openai",
        model: this.model,
        supportsVision,
        supportsStructuredOutput,
        message: `Falha de conexão com a OpenAI: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async analyzePage(input: AnalyzePageInput): Promise<AnalyzePageResult> {
    if (!this.apiKey) {
      const err = new Error("Chave de API da OpenAI não configurada.");
      (err as unknown as { code: string }).code = "API_KEY_MISSING";
      throw err;
    }

    const mime = input.mimeType || "image/jpeg";
    const dataUrl = input.imageBase64?.startsWith("data:")
      ? input.imageBase64
      : `data:${mime};base64,${input.imageBase64 || input.imageBuffer?.toString("base64") || ""}`;

    if (!dataUrl || dataUrl.length < 50) {
      throw new Error("Dados da imagem inválidos ou corrompidos.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const startTime = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${MULTIMODAL_PAGE_READING_PROMPT}\n\nPágina atual do livro: ${input.pageNumber}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: dataUrl,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return await parseOpenAICompatibleResponse(res, {
        provider: "OpenAI",
        model: this.model,
        pageNumber: input.pageNumber,
        startTime,
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutErr = new Error("A leitura da página excedeu o tempo máximo na OpenAI.");
        (timeoutErr as unknown as { code: string }).code = "MODEL_TIMEOUT";
        throw timeoutErr;
      }
      throw err;
    }
  }
}
