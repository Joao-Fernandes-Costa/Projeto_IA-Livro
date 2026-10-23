import { NextRequest, NextResponse } from "next/server";
import { AISettingsStore } from "@/lib/ai/settings-store";
import { validateBaseUrl } from "@/lib/ai/provider";
import { AISettingsUpdateRequest, AIProviderName } from "@/types/ai";
import { requireAdminSession, getAdminSessionInfo } from "@/lib/security/admin-auth";

/**
 * GET /api/settings/ai
 * Acesso exclusivo de administrador.
 * Retorna as configurações ativas e status dos provedores de forma 100% segura.
 * Retorna HTTP 403 para usuários não autenticados como administrador.
 * NUNCA retorna o valor de nenhuma chave de API.
 */
export async function GET() {
  const isAuth = await requireAdminSession();
  if (!isAuth) {
    return NextResponse.json(
      { error: "Acesso não autorizado. Apenas administradores podem acessar as configurações de IA." },
      { status: 403 }
    );
  }

  try {
    const config = AISettingsStore.getConfiguration();
    return NextResponse.json(config);
  } catch (error) {
    console.error("[API Settings Error] Falha ao obter configurações de IA:", error);
    return NextResponse.json(
      { error: "Erro interno ao obter configurações de IA." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/ai
 * Acesso exclusivo de administrador.
 * Atualiza e persiste o provider ativo, modelo, URLs base ou credenciais de forma segura.
 * Retorna HTTP 403 para usuários não autenticados como administrador.
 */
export async function PUT(request: NextRequest) {
  const isAuth = await requireAdminSession();
  if (!isAuth) {
    return NextResponse.json(
      { error: "Acesso não autorizado. Apenas administradores podem alterar as configurações de IA." },
      { status: 403 }
    );
  }

  const sessionInfo = await getAdminSessionInfo();
  const adminUser = sessionInfo?.user || "admin";

  try {
    const body = (await request.json()) as AISettingsUpdateRequest;

    // 1. Validar provider ativo se fornecido
    const validProviders: AIProviderName[] = [
      "mock",
      "ollama",
      "openrouter",
      "openai",
      "gemini",
      "custom",
    ];

    if (body.activeProvider && !validProviders.includes(body.activeProvider)) {
      return NextResponse.json(
        { error: `Provedor de IA inválido. Opções permitidas: ${validProviders.join(", ")}` },
        { status: 400 }
      );
    }

    // 2. Validar URL base se fornecida
    if (body.baseUrl) {
      const urlCheck = validateBaseUrl(body.baseUrl);
      if (!urlCheck.valid) {
        return NextResponse.json(
          { error: urlCheck.error || "URL base inválida." },
          { status: 400 }
        );
      }
    }

    // 3. Validar URLs dentro de providerConfigs se fornecidas
    if (body.providerConfigs) {
      for (const [key, conf] of Object.entries(body.providerConfigs)) {
        if (conf?.baseUrl) {
          const check = validateBaseUrl(conf.baseUrl);
          if (!check.valid) {
            return NextResponse.json(
              { error: `URL do provedor ${key} inválida: ${check.error}` },
              { status: 400 }
            );
          }
        }
      }
    }

    // 4. Salvar e persistir configurações no servidor com auditoria
    const updated = AISettingsStore.updateConfiguration(body, adminUser);

    return NextResponse.json({
      success: true,
      message: "Configurações de IA salvas e persistidas com sucesso.",
      data: updated,
    });
  } catch (error) {
    console.error("[API Settings Error] Falha ao atualizar configurações de IA:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar atualização das configurações." },
      { status: 500 }
    );
  }
}
