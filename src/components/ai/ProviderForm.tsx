"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Play,
  Save,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import type {
  AIProviderName,
  AIProviderDetailConfig,
  AIHealthResult,
} from "@/types/ai";
import { ConnectionTestResult } from "./ConnectionTestResult";

interface ProviderFormProps {
  providerId: AIProviderName;
  config: AIProviderDetailConfig;
  isActive: boolean;
  onSave: (data: {
    model: string;
    baseUrl?: string;
    name?: string;
    apiKey?: string;
  }) => Promise<void>;
  onTest: (data: {
    model: string;
    baseUrl?: string;
    apiKey?: string;
  }) => Promise<AIHealthResult>;
  onActivate: () => void;
}

export function ProviderForm({
  providerId,
  config,
  isActive,
  onSave,
  onTest,
  onActivate,
}: ProviderFormProps) {
  const [model, setModel] = useState(config.model || "");
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || "");
  const [customName, setCustomName] = useState(config.name || "9Router Proxy");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<AIHealthResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sincronizar campos quando o provider selecionado mudar
  useEffect(() => {
    setModel(config.model || config.defaultModel || "");
    setBaseUrl(config.baseUrl || config.defaultBaseUrl || "");
    setCustomName(config.name || "9Router Proxy");
    setApiKeyInput("");
    setTestResult(null);
    setSaveSuccess(false);
  }, [providerId, config]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTest({
        model,
        baseUrl: baseUrl || undefined,
        apiKey: apiKeyInput || undefined,
      });
      setTestResult(res);
    } catch {
      setTestResult({
        success: false,
        provider: providerId,
        model,
        supportsVision: false,
        supportsStructuredOutput: false,
        message: "Erro ao executar teste de conexão.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave({
        model,
        baseUrl: baseUrl || undefined,
        name: providerId === "custom" ? customName : undefined,
        apiKey: apiKeyInput || undefined,
      });
      setSaveSuccess(true);
      setApiKeyInput(""); // Limpa o input de chave por segurança
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const isKeyConfigured = config.apiKeyConfigured;

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-lg shadow-indigo-950/5 space-y-6">
      {/* Header do Form */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Configurar {config.name || providerId}
            </h3>
            {isActive && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Ativo no Sistema
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {config.description}
          </p>
        </div>

        {!isActive && (
          <button
            type="button"
            onClick={onActivate}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Definir como Provedor Ativo</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Campo Personalizado: Nome do Provedor (apenas para custom) */}
        {providerId === "custom" && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nome do Provedor Personalizado
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ex.: 9Router Proxy, vLLM Local, LM Studio"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Identificador para o seu endpoint compatível com OpenAI.
            </p>
          </div>
        )}

        {/* Campo: URL Base (para Ollama, OpenRouter, OpenAI, Custom) */}
        {providerId !== "gemini" && providerId !== "mock" && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              URL Base do Endpoint (HTTP/HTTPS)
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={config.defaultBaseUrl || "http://localhost:11434"}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {providerId === "ollama" && "Padrão local: http://localhost:11434"}
              {providerId === "openrouter" && "Padrão: https://openrouter.ai/api/v1"}
              {providerId === "openai" && "Padrão oficial: https://api.openai.com/v1"}
              {providerId === "custom" && "Exemplo: http://seu-proxy:8080/v1"}
            </p>
          </div>
        )}

        {/* Campo: Modelo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Modelo de Inteligência Artificial
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={config.defaultModel || "qwen2.5vl:3b"}
            required
            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {providerId === "ollama" && "Recomendado para visão local: qwen2.5vl:3b ou llava:7b"}
            {providerId === "gemini" && "Recomendado: gemini-1.5-flash ou gemini-2.0-flash"}
            {providerId === "openai" && "Recomendado: gpt-4o-mini ou gpt-4o"}
            {providerId === "openrouter" && "Exemplo: google/gemini-flash-1.5 ou openai/gpt-4o-mini"}
            {providerId === "custom" && "Informe o nome exato configurado no seu proxy (ex: 9Router Proxy)"}
            {providerId === "mock" && "Modelo virtual de teste pré-definido"}
          </p>
        </div>

        {/* Campo: Chave de API (quando aplicável) */}
        {providerId !== "mock" && providerId !== "ollama" && (
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Chave de API (Secret Key)
              </label>

              {isKeyConfigured ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Configurada no servidor</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Não configurada</span>
                </span>
              )}
            </div>

            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={
                isKeyConfigured
                  ? "•••••••••••••••••••••••••••••••• (deixe em branco para manter a atual)"
                  : "Insira sua chave de API aqui"
              }
              autoComplete="new-password"
              className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              <span>A chave é enviada diretamente ao servidor seguro e nunca é salva no navegador.</span>
            </p>
          </div>
        )}

        {/* Ações: Testar Conexão e Salvar */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Testando conexão...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Testar conexão</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvo!</span>
              </span>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar alterações</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Exibição do Resultado do Teste */}
      <ConnectionTestResult result={testResult} isLoading={isTesting} />
    </div>
  );
}
