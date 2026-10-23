import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "estudeai_admin_session";
const LEGACY_ADMIN_COOKIE_NAME = "estudaia_admin_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Proteção de rotas da tela /configuracoes/ia
  if (pathname === "/configuracoes/ia" || pathname.startsWith("/configuracoes/ia/")) {
    const sessionCookie =
      request.cookies.get(ADMIN_COOKIE_NAME)?.value ||
      request.cookies.get(LEGACY_ADMIN_COOKIE_NAME)?.value;

    if (!sessionCookie || sessionCookie.trim().length === 0) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 2. Proteção de rotas de API /api/settings/ai
  if (pathname === "/api/settings/ai" || pathname.startsWith("/api/settings/ai/")) {
    const sessionCookie =
      request.cookies.get(ADMIN_COOKIE_NAME)?.value ||
      request.cookies.get(LEGACY_ADMIN_COOKIE_NAME)?.value;

    if (!sessionCookie || sessionCookie.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Acesso não autorizado. Apenas administradores podem acessar ou modificar as configurações de IA.",
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/configuracoes/ia",
    "/configuracoes/ia/:path*",
    "/api/settings/ai",
    "/api/settings/ai/:path*",
  ],
};
