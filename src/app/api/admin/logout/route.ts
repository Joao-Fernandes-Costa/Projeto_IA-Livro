import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/security/admin-auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);

  return NextResponse.json({
    success: true,
    message: "Sessão administrativa encerrada com sucesso.",
  });
}
