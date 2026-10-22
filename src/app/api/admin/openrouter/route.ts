import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/admin-auth";
import { SecretStore } from "@/lib/security/secret-store";
import { AISettingsStore } from "@/lib/ai/settings-store";
import { validateBaseUrl } from "@/lib/ai/provider";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-flash-1.5";

/**
 * GET /api/admin/openrouter
 * Retorna as configurações atuais do OpenRouter com a chave mascarada.
 * NUNCA retorna a chave real.
 */
export async function GET() {
  const isAuth = await requireAdminSession();
  if (!isAuth) {
    return NextResponse.json(
      { success: false, error: "Acesso administrativo não autorizado." },
      { status: 401 }
    );
  }

  // 1. Tenta obter credencial salva no SecretStore criptografado
  const secret = await SecretStore.getSecret("openrouter");
  const memCreds = AISettingsStore.getProviderCredentials("openrouter");

  const apiKey = secret?.apiKey || "";
  const model = secret?.model || memCreds.model || DEFAULT_MODEL;
  const baseUrl = secret?.baseUrl || memCreds.baseUrl || DEFAULT_BASE_URL;
  const configured = Boolean(apiKey && apiKey.trim().length > 0);

  return NextResponse.json({
    configured,
    provider: "openrouter",
    model,
    maskedKey: configured ? SecretStore.getMaskedKey(apiKey) : "",
    baseUrl,
  });
}

/**
 * PUT /api/admin/openrouter
 * Salva e criptografa no disco a API Key e configurações do OpenRouter.
 */
export async function PUT(req: NextRequest) {
  const isAuth = await requireAdminSession();
  if (!isAuth) {
    return NextResponse.json(
      { success: false, error: "Acesso administrativo não autorizado." },
      { status: 401 }
    );
  }

  if (!SecretStore.isEncryptionConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "AI_SETTINGS_ENCRYPTION_KEY não está configurada no servidor. Configure a variável no ambiente (.env.local) para criptografar chaves.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { apiKey, model, baseUrl } = body;

    // 1. Validação da API Key
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "A chave de API do OpenRouter é obrigatória." },
        { status: 400 }
      );
    }

    const trimmedKey = apiKey.trim();
    if (trimmedKey.length < 10) {
      return NextResponse.json(
        { success: false, error: "Formato de chave de API muito curto ou inválido." },
        { status: 400 }
      );
    }

    // 2. Validação do Modelo
    if (!model || typeof model !== "string" || model.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "O nome do modelo é obrigatório." },
        { status: 400 }
      );
    }
    const trimmedModel = model.trim();

    // 3. Validação da URL Base
    const targetUrl = (baseUrl && typeof baseUrl === "string" && baseUrl.trim().length > 0)
      ? baseUrl.trim()
      : DEFAULT_BASE_URL;

    const urlCheck = validateBaseUrl(targetUrl);
    if (!urlCheck.valid) {
      return NextResponse.json(
        { success: false, error: urlCheck.error || "URL base inválida." },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === "production" && !targetUrl.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "Em ambiente de produção, a URL base deve utilizar HTTPS." },
        { status: 400 }
      );
    }

    // 4. Salva no armazenamento seguro criptografado (AES-256-GCM)
    await SecretStore.saveSecret("openrouter", {
      apiKey: trimmedKey,
      model: trimmedModel,
      baseUrl: targetUrl,
    });

    // 5. Atualiza o AISettingsStore em memória para disponibilidade imediata
    AISettingsStore.updateConfiguration({
      providerConfigs: {
        openrouter: {
          apiKey: trimmedKey,
          model: trimmedModel,
          baseUrl: targetUrl,
        },
      },
    });

    // 6. Retorna APENAS dados seguros com chave mascarada
    return NextResponse.json({
      configured: true,
      provider: "openrouter",
      maskedKey: SecretStore.getMaskedKey(trimmedKey),
      model: trimmedModel,
      baseUrl: targetUrl,
    });
  } catch (err) {
    console.error("[AdminOpenRouter] Erro ao salvar chave:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: "Erro interno ao salvar configurações do OpenRouter." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/openrouter
 * Remove a credencial criptografada e desconfigura o provedor.
 */
export async function DELETE() {
  const isAuth = await requireAdminSession();
  if (!isAuth) {
    return NextResponse.json(
      { success: false, error: "Acesso administrativo não autorizado." },
      { status: 401 }
    );
  }

  try {
    await SecretStore.deleteSecret("openrouter");

    // Limpa chave na memória do AISettingsStore
    AISettingsStore.updateConfiguration({
      providerConfigs: {
        openrouter: {
          apiKey: "",
        },
      },
    });

    return NextResponse.json({
      configured: false,
      provider: "openrouter",
      message: "Chave do OpenRouter removida com sucesso. O provider agora está desconfigurado.",
    });
  } catch (err) {
    console.error("[AdminOpenRouter] Erro ao remover chave:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: "Erro interno ao remover credenciais do OpenRouter." },
      { status: 500 }
    );
  }
}
