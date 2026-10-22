import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport, validateBaseUrl } from "./provider";
import { MULTIMODAL_PAGE_READING_PROMPT, parseAndValidatePageAnalysis } from "./schema";

export class CustomOpenAIProvider implements AIProvider {
  public readonly name: AIProviderName = "custom";
  public customName: string;
  private baseUrl: string;
  private model: string;
  private apiKey?: string;

  constructor(
    customName: string = "9Router Proxy",
    baseUrl: string = "",
    model: string = "",
    apiKey?: string
  ) {
    this.customName = customName.trim() || "Endpoint Personalizado";
    const validated = validateBaseUrl(baseUrl);
    this.baseUrl = validated.valid && validated.normalized ? validated.normalized : baseUrl.trim();
    this.model = model.trim();
    this.apiKey = apiKey?.trim();
  }

  public async checkHealth(): Promise<AIHealthResult> {
    const supportsVision = checkVisionSupport(this.model);
    const supportsStructuredOutput = checkStructuredOutputSupport("custom", this.model);

    if (!this.baseUrl) {
      return {
        success: false,
        provider: "custom",
        model: this.model || "não definido",
        supportsVision: false,
        supportsStructuredOutput: false,
        message: `URL base do ${this.customName} não foi informada. Exemplo: http://seu-proxy/v1`,
      };
    }

    const urlValidation = validateBaseUrl(this.baseUrl);
    if (!urlValidation.valid) {
      return {
        success: false,
        provider: "custom",
        model: this.model || "não definido",
        supportsVision: false,
        supportsStructuredOutput: false,
        message: urlValidation.error || `URL base do ${this.customName} inválida.`,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const res = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 401) {
        return {
          success: false,
          provider: "custom",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: `Chave de autenticação recusada pelo ${this.customName} (Erro 401).`,
        };
      }

      if (!res.ok) {
        return {
          success: false,
          provider: "custom",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: `${this.customName} respondeu com erro HTTP ${res.status}: ${res.statusText}`,
        };
      }

      if (!supportsVision) {
        return {
          success: true,
          provider: "custom",
          model: this.model,
          supportsVision: false,
          supportsStructuredOutput,
          message: `${this.customName} conectado com sucesso! Atenção: o modelo "${this.model}" não possui suporte para imagens e não pode ler páginas de livros.`,
        };
      }

      return {
        success: true,
        provider: "custom",
        model: this.model,
        supportsVision: true,
        supportsStructuredOutput: true,
        message: `${this.customName} online e operante! Modelo "${this.model}" pronto para leitura de páginas.`,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return {
          success: false,
          provider: "custom",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: `Tempo limite esgotado ao conectar no ${this.customName} (${this.baseUrl}).`,
        };
      }

      return {
        success: false,
        provider: "custom",
        model: this.model,
        supportsVision,
        supportsStructuredOutput,
        message: `Não foi possível conectar ao ${this.customName} em ${this.baseUrl}. Verifique se o serviço está ativo. (${err instanceof Error ? err.message : String(err)})`,
      };
    }
  }

  public async analyzePage(input: AnalyzePageInput): Promise<AnalyzePageResult> {
    const mime = input.mimeType || "image/jpeg";
    const dataUrl = input.imageBase64?.startsWith("data:")
      ? input.imageBase64
      : `data:${mime};base64,${input.imageBase64 || input.imageBuffer?.toString("base64") || ""}`;

    if (!dataUrl || dataUrl.length < 50) {
      throw new Error("Dados da imagem inválidos ou corrompidos para envio ao endpoint personalizado.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
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
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const errMessage = errorJson?.error?.message || res.statusText;

        if (
          res.status === 400 &&
          (errMessage.toLowerCase().includes("image") ||
            errMessage.toLowerCase().includes("vision") ||
            errMessage.toLowerCase().includes("multimodal"))
        ) {
          const err = new Error("O modelo selecionado não possui suporte para leitura de imagens.");
          (err as unknown as { code: string }).code = "VISION_NOT_SUPPORTED";
          throw err;
        }

        if (res.status === 401) {
          const err = new Error(`Chave de autenticação recusada pelo ${this.customName}.`);
          (err as unknown as { code: string }).code = "API_KEY_INVALID";
          throw err;
        }

        throw new Error(`${this.customName} erro HTTP ${res.status}: ${errMessage}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || "";

      return parseAndValidatePageAnalysis(content, input.pageNumber);
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutErr = new Error(`A leitura da página excedeu o tempo máximo no ${this.customName}.`);
        (timeoutErr as unknown as { code: string }).code = "MODEL_TIMEOUT";
        throw timeoutErr;
      }
      throw err;
    }
  }
}
