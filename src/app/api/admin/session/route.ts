import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/admin-auth";
import { SecretStore } from "@/lib/security/secret-store";

export async function GET() {
  const adminConfigured = SecretStore.isAdminPasswordConfigured();
  const encryptionConfigured = SecretStore.isEncryptionConfigured();
  const authenticated = adminConfigured ? await requireAdminSession() : false;

  return NextResponse.json({
    authenticated,
    adminConfigured,
    encryptionConfigured,
  });
}
