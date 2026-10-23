/**
 * Logger seguro para diagnóstico e auditoria do subsistema de IA.
 * 
 * Regras estritas de segurança:
 * - Registra apenas metadados seguros (usuário, provider, modelo, data, motivo de erro).
 * - NUNCA registra chaves de API.
 * - NUNCA registra conteúdo das páginas ou buffers de imagens.
 * - NUNCA registra prompts completos.
 * - NUNCA registra respostas completas da IA.
 */

export class AISafeLogger {
  /**
   * Registra alteração de configuração de IA realizada por um administrador.
   */
  public static logConfigChange(params: {
    user?: string;
    activeProvider: string;
    activeModel: string;
    timestamp?: string;
  }): void {
    const time = params.timestamp || new Date().toISOString();
    const user = params.user || "admin";
    console.log(
      `[AI Audit Log] [${time}] Usuário administrador: "${user}" alterou a configuração de IA. Provedor ativo: "${params.activeProvider}", Modelo ativo: "${params.activeModel}".`
    );
  }

  /**
   * Registra diagnóstico de erro de chamada a um provedor de IA sem vazar dados sensíveis.
   */
  public static logAIError(params: {
    provider: string;
    model: string;
    action: string;
    errorReason: string;
  }): void {
    const time = new Date().toISOString();
    console.error(
      `[AI Diagnostic Error] [${time}] Provedor: "${params.provider}" | Modelo: "${params.model}" | Ação: "${params.action}" | Motivo: "${params.errorReason}".`
    );
  }
}
