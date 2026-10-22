import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport, validateBaseUrl } from "./provider";

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

    // 1. Validar URL base
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
      // 2. Testar compatibilidade OpenAI chamando /models
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
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
          supportsVision: false,
          supportsStructuredOutput: false,
          message: `Tempo limite esgotado ao conectar no ${this.customName} (${this.baseUrl}).`,
        };
      }

      return {
        success: false,
        provider: "custom",
        model: this.model,
        supportsVision: false,
        supportsStructuredOutput: false,
        message: `Não foi possível conectar ao ${this.customName} em ${this.baseUrl}. Verifique se o serviço está ativo. (${err instanceof Error ? err.message : String(err)})`,
      };
    }
  }

  public async analyzePage(input: AnalyzePageInput): Promise<AnalyzePageResult> {
    const health = await this.checkHealth();
    if (!health.success) {
      throw new Error(`${this.customName} indisponível: ${health.message}`);
    }
    if (!health.supportsVision) {
      throw new Error("O modelo selecionado não possui suporte para imagens e não pode ler páginas de livros.");
    }

    return {
      pageNumber: input.pageNumber,
      extractedText: `[Texto extraído via ${this.customName} (${this.model}) - Página ${input.pageNumber}]`,
      summary: `Resumo gerado pelo endpoint ${this.customName} (${this.model}).`,
      keyPoints: [
        `Conceito extraído via endpoint personalizado compatível com OpenAI.`,
      ],
    };
  }
}
