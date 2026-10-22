"use client";

import React from "react";
import {
  Sparkles,
  Eye,
  EyeOff,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Server,
} from "lucide-react";
import type { AIConfiguration } from "@/types/ai";

interface ModelStatusProps {
  config: AIConfiguration;
}

export function ModelStatus({ config }: ModelStatusProps) {
  const providerDisplayNames: Record<string, string> = {
    mock: "Mock (Simulação)",
    ollama: "Ollama Local",
    openrouter: "OpenRouter",
    openai: "OpenAI",
    gemini: "Google Gemini",
    custom: config.customProviderName || "Endpoint Personalizado",
  };

  const displayName = providerDisplayNames[config.activeProvider] || config.activeProvider;

  return (
    <div className="rounded-2xl p-4 bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/70 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Provedor Selecionado:
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {displayName}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5">
            <span>Modelo:</span>
            <span className="font-bold text-indigo-700 dark:text-indigo-400">
              {config.activeModel}
            </span>
          </div>
        </div>
      </div>

      {/* Badges de Capacidade */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
            config.supportsVision
              ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
          }`}
        >
          {config.supportsVision ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Visão Ativa</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Sem Visão</span>
            </>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <Code2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>JSON Estruturado</span>
        </div>
      </div>
    </div>
  );
}
