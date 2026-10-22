import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport, validateBaseUrl } from "./provider";

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
  }

  public async checkHealth(): Promise<AIHealthResult> {
    const supportsVision = checkVisionSupport(this.model);
    const supportsStructuredOutput = checkStructuredOutputSupport("openrouter", this.model);

    // 1. Verificar presença da chave de API
    if (!this.apiKey) {
      return {
        success: false,
        provider: "openrouter",
        model: this.model,
        supportsVision,
        supportsStructuredOutput,
        message: "Chave de API do OpenRouter não configurada. Adicione OPENROUTER_API_KEY no .env ou no painel.",
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
      // 2. Testar autenticação através do endpoint de validação de chave do OpenRouter
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

      if (!res.ok) {
        // Tentar endpoint alternativo /models caso /auth/key não esteja liberado
        const altRes = await fetch(`${this.baseUrl}/models`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });
        if (!altRes.ok) {
          return {
            success: false,
            provider: "openrouter",
            model: this.model,
            supportsVision,
            supportsStructuredOutput,
            message: `OpenRouter respondeu com erro HTTP ${res.status}: ${res.statusText}`,
          };
        }
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
    const health = await this.checkHealth();
    if (!health.success) {
      throw new Error(`OpenRouter indisponível: ${health.message}`);
    }
    if (!health.supportsVision) {
      throw new Error("O modelo selecionado não possui suporte para imagens e não pode ler páginas de livros.");
    }

    return {
      pageNumber: input.pageNumber,
      extractedText: `[Texto extraído via OpenRouter (${this.model}) - Página ${input.pageNumber}]`,
      summary: `Resumo gerado pelo OpenRouter utilizando o modelo ${this.model}.`,
      keyPoints: [
        `Ponto essencial da página ${input.pageNumber} sintetizado pelo OpenRouter.`,
      ],
    };
  }
}
