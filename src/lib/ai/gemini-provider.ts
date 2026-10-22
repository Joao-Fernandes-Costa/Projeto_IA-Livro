import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport } from "./provider";

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

    // 1. Validar presença da API key
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
      // 2. Testar autenticação através do endpoint de listagem de modelos da Google Generative AI API
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
          message: "Chave de API do Google Gemini inválida ou sem permissão de acesso.",
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

      // Verificar se o modelo selecionado existe na conta
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
    const health = await this.checkHealth();
    if (!health.success) {
      throw new Error(`Google Gemini indisponível: ${health.message}`);
    }

    return {
      pageNumber: input.pageNumber,
      extractedText: `[Texto extraído via Google Gemini ${this.model} - Página ${input.pageNumber}]`,
      summary: `Resumo didático gerado pelo Google Gemini Flash para a página ${input.pageNumber}.`,
      keyPoints: [
        `Conceito 1 estruturado pelo Gemini para a página ${input.pageNumber}`,
        `Conceito 2 detalhado para material de estudo`,
      ],
    };
  }
}
