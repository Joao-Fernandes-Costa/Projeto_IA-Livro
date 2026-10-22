import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport, validateBaseUrl } from "./provider";

export class OllamaAIProvider implements AIProvider {
  public readonly name: AIProviderName = "ollama";
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = "http://localhost:11434", model: string = "qwen2.5vl:3b") {
    const validated = validateBaseUrl(baseUrl);
    this.baseUrl = validated.valid && validated.normalized ? validated.normalized : baseUrl;
    this.model = model.trim() || "qwen2.5vl:3b";
  }

  public async checkHealth(): Promise<AIHealthResult> {
    const urlValidation = validateBaseUrl(this.baseUrl);
    if (!urlValidation.valid) {
      return {
        success: false,
        provider: "ollama",
        model: this.model,
        supportsVision: false,
        supportsStructuredOutput: false,
        message: urlValidation.error || "URL base do Ollama inválida.",
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      // 1. Verificar se o Ollama está rodando e obter a lista de modelos instalados
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        return {
          success: false,
          provider: "ollama",
          model: this.model,
          supportsVision: false,
          supportsStructuredOutput: false,
          message: `Ollama respondeu com status ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      const installedModels: string[] = Array.isArray(data.models)
        ? data.models.map((m: { name?: string }) => m.name || "")
        : [];

      // 2. Verificar se o modelo especificado está instalado
      const modelClean = this.model.toLowerCase();
      const isModelInstalled = installedModels.some((m) => {
        const lower = m.toLowerCase();
        return (
          lower === modelClean ||
          lower.startsWith(`${modelClean}:`) ||
          lower.split(":")[0] === modelClean.split(":")[0]
        );
      });

      const supportsVision = checkVisionSupport(this.model);
      const supportsStructuredOutput = checkStructuredOutputSupport("ollama", this.model);

      if (!isModelInstalled) {
        return {
          success: false,
          provider: "ollama",
          model: this.model,
          supportsVision,
          supportsStructuredOutput,
          message: `Ollama está ativo, mas o modelo "${this.model}" não foi encontrado. Baixe-o com o comando: 'ollama pull ${this.model}'`,
        };
      }

      if (!supportsVision) {
        return {
          success: true, // Conexão bem-sucedida, porém sem visão
          provider: "ollama",
          model: this.model,
          supportsVision: false,
          supportsStructuredOutput,
          message: `Ollama conectado ao modelo "${this.model}". Atenção: este modelo é apenas de texto e não pode ler páginas de livros.`,
        };
      }

      return {
        success: true,
        provider: "ollama",
        model: this.model,
        supportsVision: true,
        supportsStructuredOutput,
        message: `Ollama conectado com sucesso! Modelo "${this.model}" pronto com suporte a imagens e leitura de páginas.`,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (err instanceof Error && err.name === "AbortError") {
        return {
          success: false,
          provider: "ollama",
          model: this.model,
          supportsVision: false,
          supportsStructuredOutput: false,
          message: `Tempo limite esgotado ao conectar no Ollama (${this.baseUrl}). Verifique se o servidor está ativo.`,
        };
      }

      return {
        success: false,
        provider: "ollama",
        model: this.model,
        supportsVision: false,
        supportsStructuredOutput: false,
        message: `Ollama offline ou inalcançável em ${this.baseUrl}. Inicie o serviço executando 'ollama serve' no seu terminal. (${errorMsg})`,
      };
    }
  }

  public async analyzePage(input: AnalyzePageInput): Promise<AnalyzePageResult> {
    const health = await this.checkHealth();
    if (!health.success) {
      throw new Error(`Ollama indisponível: ${health.message}`);
    }
    if (!health.supportsVision) {
      throw new Error("O modelo selecionado não possui suporte para imagens e não pode ler páginas de livros.");
    }

    return {
      pageNumber: input.pageNumber,
      extractedText: `[Texto extraído via Ollama ${this.model} - Página ${input.pageNumber}]`,
      summary: `Resumo gerado pelo Ollama (${this.model}) para a página ${input.pageNumber}.`,
      keyPoints: [
        `Tópico ${input.pageNumber}.1 identificado pelo Ollama`,
        `Tópico ${input.pageNumber}.2 sintetizado localmente`,
      ],
    };
  }
}
