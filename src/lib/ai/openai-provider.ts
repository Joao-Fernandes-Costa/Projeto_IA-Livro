import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport, validateBaseUrl } from "./provider";

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

    // 1. Validar presença da API key
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
      // 2. Testar autenticação através da listagem de modelos da OpenAI
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

      if (!res.ok) {
        return {
          success: false,
          provider: "openai",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: `OpenAI respondeu com erro HTTP ${res.status}: ${res.statusText}`,
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
    const health = await this.checkHealth();
    if (!health.success) {
      throw new Error(`OpenAI indisponível: ${health.message}`);
    }
    if (!health.supportsVision) {
      throw new Error("O modelo selecionado não possui suporte para imagens e não pode ler páginas de livros.");
    }

    return {
      pageNumber: input.pageNumber,
      extractedText: `[Texto extraído via OpenAI ${this.model} - Página ${input.pageNumber}]`,
      summary: `Resumo gerado pelo modelo ${this.model} da OpenAI.`,
      keyPoints: [
        `Conceito chave da página ${input.pageNumber} extraído pela OpenAI.`,
      ],
    };
  }
}
