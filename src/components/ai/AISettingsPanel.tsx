"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileWarning,
  Loader2,
} from "lucide-react";
import type {
  AIProviderName,
  AISettingsResponse,
  AIHealthResult,
} from "@/types/ai";
import { ModelStatus } from "./ModelStatus";
import { ProviderCard } from "./ProviderCard";
import { ProviderForm } from "./ProviderForm";

const PROVIDER_ORDER: AIProviderName[] = [
  "ollama",
  "openrouter",
  "openai",
  "gemini",
  "custom",
  "mock",
];

export function AISettingsPanel() {
  const [settings, setSettings] = useState<AISettingsResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderName>("mock");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/settings/ai");
      if (!res.ok) throw new Error("Erro ao carregar configurações");
      const data = (await res.json()) as AISettingsResponse;
      setSettings(data);
      setSelectedProvider(data.activeProvider || "mock");
    } catch {
      setStatusMessage({
        type: "error",
        text: "Não foi possível carregar as configurações de IA do servidor.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleActivateProvider = async (providerId: AIProviderName) => {
    try {
      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeProvider: providerId }),
      });
      if (!res.ok) throw new Error("Falha ao ativar provedor.");
      const data = await res.json();
      setSettings(data.data);
      setSelectedProvider(providerId);
      setStatusMessage({
        type: "success",
        text: `Provedor ${data.data.providers[providerId]?.name || providerId} definido como ativo no EstudaIA!`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      setStatusMessage({
        type: "error",
        text: "Erro ao definir o provedor ativo.",
      });
    }
  };

  const handleSaveProviderConfig = async (data: {
    model: string;
    baseUrl?: string;
    name?: string;
    apiKey?: string;
  }) => {
    try {
      const payload = {
        activeModel: selectedProvider === settings?.activeProvider ? data.model : undefined,
        baseUrl: selectedProvider === settings?.activeProvider ? data.baseUrl : undefined,
        customProviderName: selectedProvider === "custom" ? data.name : undefined,
        providerConfigs: {
          [selectedProvider]: {
            model: data.model,
            baseUrl: data.baseUrl,
            apiKey: data.apiKey,
            name: data.name,
          },
        },
      };

      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar alterações.");
      }

      const resData = await res.json();
      setSettings(resData.data);
      setStatusMessage({
        type: "success",
        text: "Configurações salvas no servidor com sucesso!",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao salvar configurações.",
      });
      throw err;
    }
  };

  const handleTestConnection = async (data: {
    model: string;
    baseUrl?: string;
    apiKey?: string;
  }): Promise<AIHealthResult> => {
    const res = await fetch("/api/settings/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: selectedProvider,
        model: data.model,
        baseUrl: data.baseUrl,
        apiKey: data.apiKey,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return err;
    }

    return res.json();
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Carregando arquitetura de provedores de IA...
        </p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-3xl p-8 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
        <h3 className="text-base font-bold text-rose-950 dark:text-rose-100">
          Não foi possível conectar ao subsistema de IA
        </h3>
        <button
          type="button"
          onClick={fetchSettings}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const selectedConfig = settings.providers[selectedProvider];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Toast de Feedback */}
      {statusMessage && (
        <div
          role="status"
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in duration-150 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 text-rose-900 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Alerta Global se o Modelo Ativo não suportar visão */}
      {!settings.supportsVision && (
        <div className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-start gap-3">
          <FileWarning className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100">
              Aviso de Capacidade Multimodal
            </h4>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              O modelo selecionado não possui suporte para imagens e não pode ler páginas de livros.
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Alterne para um modelo com visão (ex.: Qwen2.5-VL, GPT-4o Mini ou Gemini 1.5 Flash) para que a leitura dos livros funcione corretamente.
            </p>
          </div>
        </div>
      )}

      {/* Status do Modelo Ativo */}
      <ModelStatus config={settings} />

      {/* Grid de Escolha dos Provedores */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Provedores de Inteligência Artificial
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Selecione o provedor desejado para configurar ou definir como principal.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSettings}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Recarregar status dos provedores"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PROVIDER_ORDER.map((provId) => {
            const conf = settings.providers[provId];
            if (!conf) return null;

            const isCurrentActive = settings.activeProvider === provId;
            const isSelected = selectedProvider === provId;
            const requiresKey = provId === "openrouter" || provId === "openai" || provId === "gemini";

            return (
              <ProviderCard
                key={provId}
                id={provId}
                title={conf.name || provId}
                description={conf.description || ""}
                model={conf.model}
                baseUrl={conf.baseUrl}
                isActive={isCurrentActive}
                isSelected={isSelected}
                apiKeyConfigured={conf.apiKeyConfigured}
                requiresKey={requiresKey}
                onSelect={() => setSelectedProvider(provId)}
                onActivate={() => handleActivateProvider(provId)}
              />
            );
          })}
        </div>
      </div>

      {/* Painel de Edição do Provedor Selecionado */}
      <div className="space-y-3 pt-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Parâmetros do Provedor
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Ajuste a URL base, nome do modelo e teste a conexão antes de iniciar o estudo.
          </p>
        </div>

        <ProviderForm
          key={selectedProvider}
          providerId={selectedProvider}
          config={selectedConfig}
          isActive={settings.activeProvider === selectedProvider}
          onSave={handleSaveProviderConfig}
          onTest={handleTestConnection}
          onActivate={() => handleActivateProvider(selectedProvider)}
        />
      </div>
    </div>
  );
}
