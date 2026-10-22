import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface StoredProviderSecret {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  updatedAt: string;
}

type SecretsMap = Record<string, StoredProviderSecret>;

const SECRETS_DIR = path.join(process.cwd(), ".data");
const SECRETS_FILE = path.join(SECRETS_DIR, "ai-secrets.enc");

/**
 * Obtém a chave de 32 bytes para AES-256-GCM a partir de AI_SETTINGS_ENCRYPTION_KEY.
 */
function getEncryptionKey(): Buffer | null {
  const envKey = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  if (!envKey || envKey.trim().length === 0) {
    return null;
  }
  // Deriva 32 bytes consistentes usando SHA-256
  return crypto.createHash("sha256").update(envKey.trim()).digest();
}

/**
 * Criptografa uma string usando AES-256-GCM com IV aleatório de 12 bytes.
 * Formato de saída: ivHex:authTagHex:encryptedHex
 */
function encrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Descriptografa um texto no formato ivHex:authTagHex:encryptedHex com AES-256-GCM.
 */
function decrypt(ciphertext: string, key: Buffer): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Formato de segredo criptografado inválido ou corrompido.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Garante que o diretório de dados seguro exista com permissões restritas.
 */
function ensureSecretsDir(): void {
  if (!fs.existsSync(SECRETS_DIR)) {
    fs.mkdirSync(SECRETS_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Lê todos os segredos descriptografados do disco.
 */
function readAllSecrets(): SecretsMap {
  if (!fs.existsSync(SECRETS_FILE)) {
    return {};
  }

  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      "AI_SETTINGS_ENCRYPTION_KEY não configurada no servidor. Não é possível ler segredos."
    );
  }

  try {
    const rawContent = fs.readFileSync(SECRETS_FILE, "utf8").trim();
    if (!rawContent) return {};

    const decryptedJson = decrypt(rawContent, key);
    return JSON.parse(decryptedJson) as SecretsMap;
  } catch (err) {
    // Se a chave mudou ou o arquivo estiver corrompido
    console.error("[SecretStore] Falha ao descriptografar segredos:", err instanceof Error ? err.message : err);
    throw new Error("Falha ao descriptografar armazenamento de segredos. Verifique AI_SETTINGS_ENCRYPTION_KEY.");
  }
}

/**
 * Grava todos os segredos criptografados no disco.
 */
function writeAllSecrets(secrets: SecretsMap): void {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      "AI_SETTINGS_ENCRYPTION_KEY não configurada no servidor. Não é possível salvar segredos."
    );
  }

  ensureSecretsDir();

  const serialized = JSON.stringify(secrets);
  const encrypted = encrypt(serialized, key);

  // Escrita com permissão restrita 0o600 (apenas proprietário)
  fs.writeFileSync(SECRETS_FILE, encrypted, { encoding: "utf8", mode: 0o600 });
}

export class SecretStore {
  /**
   * Verifica se a chave de criptografia do servidor está configurada.
   */
  public static isEncryptionConfigured(): boolean {
    return Boolean(process.env.AI_SETTINGS_ENCRYPTION_KEY && process.env.AI_SETTINGS_ENCRYPTION_KEY.trim().length > 0);
  }

  /**
   * Verifica se a senha administrativa está configurada no servidor.
   */
  public static isAdminPasswordConfigured(): boolean {
    return Boolean(process.env.AI_ADMIN_PASSWORD && process.env.AI_ADMIN_PASSWORD.trim().length > 0);
  }

  /**
   * Obtém a credencial descriptografada de um provedor de forma síncrona.
   */
  public static getSecretSync(provider: string): StoredProviderSecret | null {
    if (!this.isEncryptionConfigured() || !fs.existsSync(SECRETS_FILE)) {
      return null;
    }

    try {
      const secrets = readAllSecrets();
      return secrets[provider] || null;
    } catch {
      return null;
    }
  }

  /**
   * Obtém a credencial descriptografada de um provedor.
   */
  public static async getSecret(provider: string): Promise<StoredProviderSecret | null> {
    return this.getSecretSync(provider);
  }

  /**
   * Salva a credencial criptografada de um provedor de forma síncrona.
   */
  public static saveSecretSync(
    provider: string,
    data: { apiKey: string; model?: string; baseUrl?: string }
  ): void {
    if (!this.isEncryptionConfigured()) {
      return;
    }

    if (!data.apiKey || data.apiKey.trim().length === 0) {
      return;
    }

    const secrets = readAllSecrets();
    secrets[provider] = {
      apiKey: data.apiKey.trim(),
      model: data.model?.trim() || undefined,
      baseUrl: data.baseUrl?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    writeAllSecrets(secrets);
  }

  /**
   * Salva a credencial criptografada de um provedor no armazenamento server-side seguro.
   */
  public static async saveSecret(
    provider: string,
    data: { apiKey: string; model?: string; baseUrl?: string }
  ): Promise<void> {
    if (!this.isEncryptionConfigured()) {
      throw new Error(
        "AI_SETTINGS_ENCRYPTION_KEY não configurada no servidor. Configure a variável no ambiente para salvar chaves."
      );
    }

    if (!data.apiKey || data.apiKey.trim().length === 0) {
      throw new Error("A chave de API não pode ser vazia.");
    }

    this.saveSecretSync(provider, data);
  }

  /**
   * Remove a credencial criptografada de um provedor.
   */
  public static async deleteSecret(provider: string): Promise<boolean> {
    if (!this.isEncryptionConfigured() || !fs.existsSync(SECRETS_FILE)) {
      return false;
    }

    const secrets = readAllSecrets();
    if (!secrets[provider]) {
      return false;
    }

    delete secrets[provider];
    writeAllSecrets(secrets);
    return true;
  }

  /**
   * Verifica se há credencial armazenada para o provedor.
   */
  public static async isConfigured(provider: string): Promise<boolean> {
    const secret = await this.getSecret(provider);
    return Boolean(secret && secret.apiKey && secret.apiKey.length > 0);
  }

  /**
   * Mascara uma chave de API para exibição segura.
   * Formato padrão: sk-or-v1-••••••••1234
   * NUNCA retorna a chave integral.
   */
  public static getMaskedKey(apiKey: string): string {
    if (!apiKey || apiKey.trim().length === 0) {
      return "";
    }

    const trimmed = apiKey.trim();
    if (trimmed.length <= 8) {
      return "••••••••";
    }

    if (trimmed.startsWith("sk-or-v1-")) {
      const last4 = trimmed.slice(-4);
      return `sk-or-v1-••••••••${last4}`;
    }

    if (trimmed.startsWith("sk-")) {
      const last4 = trimmed.slice(-4);
      return `sk-••••••••${last4}`;
    }

    const prefix = trimmed.slice(0, 8);
    const last4 = trimmed.slice(-4);
    return `${prefix}••••••••${last4}`;
  }
}
