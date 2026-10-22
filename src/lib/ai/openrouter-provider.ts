import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport, validateBaseUrl } from "./provider";
import { MULTIMODAL_PAGE_READING_PROMPT } from "./schema";
import { SecretStore } from "@/lib/security/secret-store";
import { parseOpenAICompatibleResponse } from "./response-parser";

export class OpenRouterAIProvider implements AIProvider {
  public readonly name: AIProviderName = "openrouter";
  private baseUrl: string;
  private model: string;
  private apiKey?: string;

  constructor(
    baseUrl: string = "https://openrouter.ai/api/v1",
    model: string = "google/gemini-flash-1.5",
    apiKey?: string
  ) {
    const validated = validateBaseUrl(baseUrl);
    this.baseUrl = validated.valid && validated.normalized ? validated.normalized : baseUrl;
    this.model = model.trim() || "google/gemini-flash-1.5";
    this.apiKey = apiKey?.trim();

    // Se apiKey não foi passada explicitamente, busca no SecretStore criptografado
    if (!this.apiKey) {
      const stored = SecretStore.getSecretSync("openrouter");
      if (stored) {
        if (stored.apiKey) this.apiKey = stored.apiKey;
        if (stored.model && (!model || model === "google/gemini-flash-1.5")) {
          this.model = stored.model;
        }
        if (stored.baseUrl && (!baseUrl || baseUrl === "https://openrouter.ai/api/v1")) {
          this.baseUrl = stored.baseUrl;
        }
      }
    }
  }

  public async checkHealth(): Promise<AIHealthResult> {
    // Atualiza com SecretStore caso a chave tenha sido gravada após inicialização
    if (!this.apiKey) {
      const stored = SecretStore.getSecretSync("openrouter");
      if (stored?.apiKey) {
        this.apiKey = stored.apiKey;
        if (stored.model) this.model = stored.model;
        if (stored.baseUrl) this.baseUrl = stored.baseUrl;
      }
    }

    const supportsVision = checkVisionSupport(this.model);
    const supportsStructuredOutput = checkStructuredOutputSupport("openrouter", this.model);

    if (!this.apiKey) {
      return {
        success: false,
        provider: "openrouter",
        model: this.model,
        supportsVision,
        supportsStructuredOutput,
        message: "Chave de API do OpenRouter não configurada. Cadastre sua chave no painel administrativo (/admin/configuracoes/ia) ou defina OPENROUTER_API_KEY no ambiente.",
      };
    }

    const urlValidation = validateBaseUrl(this.baseUrl);
    if (!urlValidation.valid) {
      return {
        success: false,
        provider: "openrouter",
        model: this.model,
        supportsVision: false,
        supportsStructuredOutput: false,
        message: urlValidation.error || "URL base do OpenRouter inválida.",
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(`${this.baseUrl}/auth/key`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://estudaia.local",
          "X-Title": "EstudaIA",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 401) {
        return {
          success: false,
          provider: "openrouter",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: "Chave de API do OpenRouter inválida ou não autorizada.",
        };
      }

      if (res.status === 429) {
        return {
          success: false,
          provider: "openrouter",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: "Limite de requisições excedido ou créditos insuficientes na conta do OpenRouter.",
        };
      }

      if (!supportsVision) {
        return {
          success: true,
          provider: "openrouter",
          model: this.model,
          supportsVision: false,
          supportsStructuredOutput,
          message: `Autenticação bem-sucedida no OpenRouter! Atenção: o modelo "${this.model}" não possui suporte a imagens.`,
        };
      }

      return {
        success: true,
        provider: "openrouter",
        model: this.model,
        supportsVision: true,
        supportsStructuredOutput,
        message: `OpenRouter conectado e autenticado com sucesso! Modelo "${this.model}" pronto para leitura de páginas.`,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return {
          success: false,
          provider: "openrouter",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: "Tempo limite esgotado ao conectar aos servidores do OpenRouter.",
        };
      }

      return {
        success: false,
        provider: "openrouter",
        model: this.model,
        supportsVision,
        supportsStructuredOutput,
        message: `Falha de conexão com o OpenRouter: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async analyzePage(input: AnalyzePageInput): Promise<AnalyzePageResult> {
    if (!this.apiKey) {
      const stored = SecretStore.getSecretSync("openrouter");
      if (stored?.apiKey) {
        this.apiKey = stored.apiKey;
        if (stored.model) this.model = stored.model;
        if (stored.baseUrl) this.baseUrl = stored.baseUrl;
      }
    }

    if (!this.apiKey) {
      const err = new Error("Chave de API do OpenRouter não configurada. Configure no painel administrativo.");
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
          "HTTP-Referer": "https://estudaia.local",
          "X-Title": "EstudaIA",
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
        provider: "OpenRouter",
        model: this.model,
        pageNumber: input.pageNumber,
        startTime,
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutErr = new Error("A leitura da página excedeu o tempo máximo no OpenRouter.");
        (timeoutErr as unknown as { code: string }).code = "MODEL_TIMEOUT";
        throw timeoutErr;
      }
      throw err;
    }
  }
}
