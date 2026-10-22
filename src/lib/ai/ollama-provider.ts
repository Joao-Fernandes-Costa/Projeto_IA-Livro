import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
} from "@/types/ai";
import { checkVisionSupport, checkStructuredOutputSupport, validateBaseUrl } from "./provider";
import { MULTIMODAL_PAGE_READING_PROMPT, parseAndValidatePageAnalysis } from "./schema";

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
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
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
          success: true,
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
          supportsVision: checkVisionSupport(this.model),
          supportsStructuredOutput: false,
          message: `Tempo limite esgotado ao conectar no Ollama (${this.baseUrl}). Verifique se o servidor está ativo.`,
        };
      }

      return {
        success: false,
        provider: "ollama",
        model: this.model,
        supportsVision: checkVisionSupport(this.model),
        supportsStructuredOutput: false,
        message: `Ollama offline ou inalcançável em ${this.baseUrl}. Inicie o serviço executando 'ollama serve' no seu terminal. (${errorMsg})`,
      };
    }
  }

  public async analyzePage(input: AnalyzePageInput): Promise<AnalyzePageResult> {
    const rawBase64 = input.imageBase64
      ? input.imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "")
      : input.imageBuffer
      ? input.imageBuffer.toString("base64")
      : "";

    if (!rawBase64) {
      throw new Error("Nenhuma imagem fornecida para leitura no Ollama.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45s por página

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: `${MULTIMODAL_PAGE_READING_PROMPT}\n\nPágina atual: ${input.pageNumber}`,
              images: [rawBase64],
            },
          ],
          format: "json",
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMessage = errorData.error || response.statusText;

        // Se o Ollama acusar que o modelo não suporta imagem
        if (
          errMessage.toLowerCase().includes("does not support images") ||
          errMessage.toLowerCase().includes("vision")
        ) {
          const err = new Error("O modelo selecionado não possui suporte para leitura de imagens.");
          (err as unknown as { code: string }).code = "VISION_NOT_SUPPORTED";
          throw err;
        }

        throw new Error(`Ollama retornou erro HTTP ${response.status}: ${errMessage}`);
      }

      const resultData = await response.json();
      const rawText = resultData.message?.content || "";

      return parseAndValidatePageAnalysis(rawText, input.pageNumber);
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutErr = new Error("A leitura da página excedeu o tempo limite máximo no Ollama.");
        (timeoutErr as unknown as { code: string }).code = "MODEL_TIMEOUT";
        throw timeoutErr;
      }
      throw err;
    }
  }
}
