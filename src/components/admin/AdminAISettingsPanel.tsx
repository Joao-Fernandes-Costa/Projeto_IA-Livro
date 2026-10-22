"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Key,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Trash2,
  Save,
  Zap,
  Globe,
  Sliders,
  Sparkles,
  Info,
} from "lucide-react";

interface AdminAISettingsPanelProps {
  onSessionExpired?: () => void;
  encryptionConfigured: boolean;
}

interface OpenRouterConfigData {
  configured: boolean;
  provider: string;
  model: string;
  maskedKey: string;
  baseUrl: string;
}

interface TestResult {
  success: boolean;
  provider: string;
  model: string;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  message: string;
}

const POPULAR_VISION_MODELS = [
  { id: "google/gemini-flash-1.5", label: "Gemini 1.5 Flash", badge: "Recomendado / Rápido" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", badge: "Econômico / Visão" },
  { id: "meta-llama/llama-3.2-11b-vision-instruct", label: "Llama 3.2 11B Vision", badge: "Open Source" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", badge: "Alta Precisão" },
];

export function AdminAISettingsPanel({
  onSessionExpired,
  encryptionConfigured,
}: AdminAISettingsPanelProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Dados do OpenRouter
  const [config, setConfig] = useState<OpenRouterConfigData>({
    configured: false,
    provider: "openrouter",
    model: "google/gemini-flash-1.5",
    maskedKey: "",
    baseUrl: "https://openrouter.ai/api/v1",
  });

  // Campos do formulário
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [modelInput, setModelInput] = useState<string>("google/gemini-flash-1.5");
  const [baseUrlInput, setBaseUrlInput] = useState<string>("https://openrouter.ai/api/v1");

  // Feedback e resultado de teste
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Carrega configuração salva
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/openrouter");
      if (res.status === 401) {
        onSessionExpired?.();
        return;
      }
      if (!res.ok) {
        throw new Error("Falha ao carregar configurações administrativas.");
      }
      const data: OpenRouterConfigData = await res.json();
      setConfig(data);
      if (data.model) setModelInput(data.model);
      if (data.baseUrl) setBaseUrlInput(data.baseUrl);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao carregar dados.",
      });
    } finally {
      setLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Salvar chave e configuração
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setFeedback({
        type: "error",
        message: "Por favor, informe a chave de API do OpenRouter.",
      });
      return;
    }

    if (!modelInput.trim()) {
      setFeedback({
        type: "error",
        message: "Por favor, informe o modelo a ser utilizado.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/openrouter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeyInput.trim(),
          model: modelInput.trim(),
          baseUrl: baseUrlInput.trim() || "https://openrouter.ai/api/v1",
        }),
      });

      if (res.status === 401) {
        onSessionExpired?.();
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao salvar chave.");
      }

      // Sucesso: atualiza estado, limpa campo raw da chave
      setConfig({
        configured: true,
        provider: "openrouter",
        model: data.model,
        maskedKey: data.maskedKey,
        baseUrl: data.baseUrl,
      });
      setApiKeyInput("");

      setFeedback({
        type: "success",
        message:
          "Chave do OpenRouter criptografada com AES-256-GCM e salva com sucesso no servidor!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao salvar credencial.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Testar conexão
  const handleTest = async () => {
    setTesting(true);
    setFeedback(null);
    setTestResult(null);

    try {
      const payload: { apiKey?: string; model?: string; baseUrl?: string } = {
        model: modelInput.trim(),
        baseUrl: baseUrlInput.trim() || undefined,
      };

      // Se o usuário digitou uma nova chave no input, testa ela; senão testa a salva
      if (apiKeyInput.trim()) {
        payload.apiKey = apiKeyInput.trim();
      }

      const res = await fetch("/api/admin/openrouter/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        onSessionExpired?.();
        return;
      }

      const data: TestResult = await res.json();
      setTestResult(data);

      if (!data.success) {
        setFeedback({
          type: "error",
          message: data.message || "Falha no teste de conexão com OpenRouter.",
        });
      } else {
        setFeedback({
          type: "success",
          message: data.message || "Conexão com OpenRouter verificada com sucesso!",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao testar conexão.",
      });
    } finally {
      setTesting(false);
    }
  };

  // Remover chave
  const handleDelete = async () => {
    if (
      !window.confirm(
        "Tem certeza que deseja remover a chave criptografada do OpenRouter do servidor?"
      )
    ) {
      return;
    }

    setDeleting(true);
    setFeedback(null);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/openrouter", {
        method: "DELETE",
      });

      if (res.status === 401) {
        onSessionExpired?.();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao remover chave.");
      }

      setConfig((prev) => ({
        ...prev,
        configured: false,
        maskedKey: "",
      }));
      setApiKeyInput("");

      setFeedback({
        type: "info",
        message: "Chave criptografada removida com sucesso. O provider agora está desconfigurado.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao remover chave.",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Carregando credenciais seguras do OpenRouter...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Alerta caso chave de criptografia não esteja configurada */}
      {!encryptionConfigured && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">Aviso de Configuração Incompleta:</p>
            <p>
              A variável <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono">AI_SETTINGS_ENCRYPTION_KEY</code> não está configurada no arquivo de ambiente. Para salvar e criptografar chaves em disco, adicione-a no seu <code className="font-mono">.env.local</code>.
            </p>
          </div>
        </div>
      )}

      {/* 2. Status Geral do Provider */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              config.configured
                ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
            }`}
          >
            {config.configured ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <Shield className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                OpenRouter
              </h2>
              {config.configured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" /> Configurado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Não configurado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {config.configured
                ? `Chave criptografada ativa: ${config.maskedKey}`
                : "Nenhuma chave registrada. Cadastre sua API key abaixo."}
            </p>
          </div>
        </div>

        {config.configured && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>{testing ? "Testando..." : "Testar conexão"}</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition disabled:opacity-50"
              title="Remover chave salva"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover chave</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : feedback.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
              : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : feedback.type === "error" ? (
            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{feedback.message}</span>
        </div>
      )}

      {/* 4. Resultado detalhado do Teste */}
      {testResult && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
            testResult.success
              ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              )}
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {testResult.success
                  ? "Conexão com OpenRouter validada!"
                  : "Falha na conexão com OpenRouter"}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {testResult.supportsVision ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" /> Suporta Imagens
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3 h-3" /> Sem suporte a visão
                </span>
              )}

              {testResult.supportsStructuredOutput && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                  JSON Estruturado
                </span>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            {testResult.message}
          </p>
        </div>
      )}

      {/* 5. Formulário de Configuração */}
      <form
        onSubmit={handleSave}
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
      >
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Credenciais e Modelo do OpenRouter</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            A chave é transmitida exclusivamente por HTTPS e criptografada com AES-256-GCM antes de ser armazenada no servidor.
          </p>
        </div>

        {/* Campo API Key */}
        <div className="space-y-2">
          <label
            htmlFor="openrouter-api-key"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Chave de API do OpenRouter
          </label>

          <div className="relative">
            <input
              id="openrouter-api-key"
              type={showApiKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={
                config.configured
                  ? `Chave salva: ${config.maskedKey} (digite para alterar)`
                  : "Cole sua chave sk-or-v1-..."
              }
              className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              autoComplete="off"
              spellCheck="false"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title={showApiKey ? "Ocultar chave" : "Mostrar chave"}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Começa com <code className="font-mono">sk-or-v1-</code></span>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Gerar chave no OpenRouter</span>
              <Globe className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Campo Modelo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="openrouter-model"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Modelo Multimodal
            </label>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Suporte a imagens obrigatório
            </span>
          </div>

          <input
            id="openrouter-model"
            type="text"
            value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
            placeholder="Ex: google/gemini-flash-1.5"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            required
          />

          {/* Sugestões rápidas de modelos com visão */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Sugestões de modelos compatíveis:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_VISION_MODELS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setModelInput(item.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition ${
                    modelInput === item.id
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                  }`}
                >
                  {item.label}{" "}
                  <span className="opacity-75 text-[10px]">({item.badge})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Campo Base URL */}
        <div className="space-y-2">
          <label
            htmlFor="openrouter-base-url"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            URL Base (Opcional)
          </label>

          <input
            id="openrouter-base-url"
            type="url"
            value={baseUrlInput}
            onChange={(e) => setBaseUrlInput(e.target.value)}
            placeholder="https://openrouter.ai/api/v1"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Padrão oficial: <code className="font-mono">https://openrouter.ai/api/v1</code>
          </span>
        </div>

        {/* Ações do Formulário */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Criptografia AES-256-GCM server-side</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || saving || (!apiKeyInput.trim() && !config.configured)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{testing ? "Testando..." : "Testar conexão"}</span>
            </button>

            <button
              type="submit"
              disabled={saving || !encryptionConfigured}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? "Salvando..." : "Salvar chave"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
