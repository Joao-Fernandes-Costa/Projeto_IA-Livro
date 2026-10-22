import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  createSessionToken,
  verifyAdminPassword,
  getAdminCookieOptions,
  getClientIp,
} from "@/lib/security/admin-auth";
import { SecretStore } from "@/lib/security/secret-store";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // 1. Verifica se a senha do admin está configurada no servidor
  if (!SecretStore.isAdminPasswordConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "AI_ADMIN_PASSWORD não está configurada no servidor. Defina a variável no ambiente (.env.local) para habilitar o acesso administrativo.",
      },
      { status: 503 }
    );
  }

  // 2. Proteção contra força bruta (Rate Limiting)
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Muitas tentativas incorretas. Acesso bloqueado por segurança. Tente novamente em ${rateLimit.retryAfterSeconds} segundos.`,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Senha administrativa não informada." },
        { status: 400 }
      );
    }

    // 3. Validação segura e timing-safe da senha
    const isValid = verifyAdminPassword(password);
    if (!isValid) {
      const failed = recordFailedAttempt(ip);
      const remainingMsg =
        failed.remainingAttempts > 0
          ? ` Tentativas restantes: ${failed.remainingAttempts}.`
          : " Acesso bloqueado temporariamente.";

      return NextResponse.json(
        {
          success: false,
          error: `Senha administrativa incorreta.${remainingMsg}`,
          remainingAttempts: failed.remainingAttempts,
          retryAfterSeconds: failed.retryAfterSeconds,
        },
        { status: 401 }
      );
    }

    // 4. Sucesso: reseta tentativas e emite cookie HttpOnly
    resetRateLimit(ip);
    const token = createSessionToken();
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, token, getAdminCookieOptions());

    return NextResponse.json({
      success: true,
      message: "Autenticação administrativa realizada com sucesso.",
    });
  } catch (err) {
    console.error("[AdminLogin] Erro ao processar login:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: "Erro interno ao processar autenticação." },
      { status: 500 }
    );
  }
}
