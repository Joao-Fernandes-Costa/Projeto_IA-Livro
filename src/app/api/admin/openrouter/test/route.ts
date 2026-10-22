import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/admin-auth";
import { SecretStore } from "@/lib/security/secret-store";
import { AISettingsStore } from "@/lib/ai/settings-store";
import { OpenRouterAIProvider } from "@/lib/ai/openrouter-provider";
import { validateBaseUrl } from "@/lib/ai/provider";

export async function POST(req: NextRequest) {
  const isAuth = await requireAdminSession();
  if (!isAuth) {
    return NextResponse.json(
      { success: false, error: "Acesso administrativo não autorizado." },
      { status: 401 }
    );
  }

  try {
    let body: { apiKey?: string; model?: string; baseUrl?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body vazio é aceitável para testar a chave já salva
    }

    // 1. Determina a chave: do body (se digitada para teste) ou do SecretStore / Store
    let apiKey = body.apiKey?.trim();
    let model = body.model?.trim();
    let baseUrl = body.baseUrl?.trim();

    if (!apiKey) {
      const storedSecret = await SecretStore.getSecret("openrouter");
      const memCreds = AISettingsStore.getProviderCredentials("openrouter");
      apiKey = storedSecret?.apiKey || memCreds.apiKey || "";
      if (!model) model = storedSecret?.model || memCreds.model;
      if (!baseUrl) baseUrl = storedSecret?.baseUrl || memCreds.baseUrl;
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          provider: "openrouter",
          model: model || "google/gemini-flash-1.5",
          supportsVision: false,
          supportsStructuredOutput: false,
          message: "Nenhuma chave de API fornecida ou salva para testar.",
        },
        { status: 400 }
      );
    }

    const finalModel = model || "google/gemini-flash-1.5";
    const finalBaseUrl = baseUrl || "https://openrouter.ai/api/v1";

    const urlCheck = validateBaseUrl(finalBaseUrl);
    if (!urlCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          provider: "openrouter",
          model: finalModel,
          supportsVision: false,
          supportsStructuredOutput: false,
          message: urlCheck.error || "URL base inválida.",
        },
        { status: 400 }
      );
    }

    // 2. Executa o teste através da classe OpenRouterAIProvider
    const provider = new OpenRouterAIProvider(finalBaseUrl, finalModel, apiKey);
    const health = await provider.checkHealth();

    // 3. Retorna o resultado sem expor a chave de API
    return NextResponse.json({
      success: health.success,
      provider: "openrouter",
      model: finalModel,
      supportsVision: health.supportsVision,
      supportsStructuredOutput: health.supportsStructuredOutput,
      message: health.message,
    });
  } catch (err) {
    console.error("[AdminOpenRouterTest] Erro ao testar:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        success: false,
        provider: "openrouter",
        model: "unknown",
        supportsVision: false,
        supportsStructuredOutput: false,
        message: "Erro inesperado ao testar conexão com OpenRouter.",
      },
      { status: 500 }
    );
  }
}
