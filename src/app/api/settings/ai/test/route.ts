import { NextRequest, NextResponse } from "next/server";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { AITestRequest, AIProviderName } from "@/types/ai";
import { requireAdminSession } from "@/lib/security/admin-auth";
import { AISafeLogger } from "@/lib/ai/safe-logger";

/**
 * POST /api/settings/ai/test
 * Acesso exclusivo de administrador.
 * Testa a conectividade e capacidade multimodal do provedor selecionado.
 * Retorna HTTP 403 para usuários não autenticados como administrador.
 */
export async function POST(request: NextRequest) {
  const isAuth = await requireAdminSession();
  if (!isAuth) {
    return NextResponse.json(
      {
        success: false,
        provider: "mock",
        model: "desconhecido",
        supportsVision: false,
        supportsStructuredOutput: false,
        message: "Acesso não autorizado. Apenas administradores podem testar a conexão dos provedores de IA.",
      },
      { status: 403 }
    );
  }

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

    if (!result.success) {
      AISafeLogger.logAIError({
        provider: body.provider,
        model: body.model || provider.name,
        action: "checkHealth",
        errorReason: result.message,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
    AISafeLogger.logAIError({
      provider: "desconhecido",
      model: "desconhecido",
      action: "checkHealthException",
      errorReason: errorMsg,
    });

    return NextResponse.json(
      {
        success: false,
        provider: "mock",
        model: "desconhecido",
        supportsVision: false,
        supportsStructuredOutput: false,
        message: `Falha interna no teste de conexão: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
