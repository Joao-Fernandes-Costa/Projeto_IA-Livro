import { NextRequest, NextResponse } from "next/server";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { AITestRequest, AIProviderName } from "@/types/ai";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AITestRequest;

    if (!body || !body.provider) {
      return NextResponse.json(
        {
          success: false,
          provider: "mock",
          model: "desconhecido",
          supportsVision: false,
          supportsStructuredOutput: false,
          message: "Provedor de IA não informado na requisição de teste.",
        },
        { status: 400 }
      );
    }

    const validProviders: AIProviderName[] = [
      "mock",
      "ollama",
      "openrouter",
      "openai",
      "gemini",
      "custom",
    ];

    if (!validProviders.includes(body.provider)) {
      return NextResponse.json(
        {
          success: false,
          provider: body.provider,
          model: body.model || "desconhecido",
          supportsVision: false,
          supportsStructuredOutput: false,
          message: `Provedor de IA não suportado: ${body.provider}.`,
        },
        { status: 400 }
      );
    }

    // Instancia o provedor com os overrides fornecidos para o teste
    const provider = AIProviderFactory.getProvider(body.provider, {
      model: body.model,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
    });

    // Executa a checagem de saúde e conectividade
    const result = await provider.checkHealth();

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI Test Error] Falha inesperada durante o teste de conexão:", error);
    return NextResponse.json(
      {
        success: false,
        provider: "mock",
        model: "desconhecido",
        supportsVision: false,
        supportsStructuredOutput: false,
        message: `Falha interna no teste de conexão: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      },
      { status: 500 }
    );
  }
}
