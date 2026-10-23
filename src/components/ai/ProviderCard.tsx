"use client";

import React from "react";
import {
  Server,
  Network,
  Sparkles,
  Bot,
  Sliders,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { AIProviderName } from "@/types/ai";

interface ProviderCardProps {
  id: AIProviderName;
  title: string;
  description: string;
  model: string;
  baseUrl?: string;
  isActive: boolean;
  isSelected: boolean;
  apiKeyConfigured: boolean;
  requiresKey: boolean;
  onSelect: () => void;
  onActivate: () => void;
}

const PROVIDER_ICONS: Record<AIProviderName, React.ComponentType<{ className?: string }>> = {
  mock: FlaskConical,
  ollama: Server,
  openrouter: Network,
  openai: Bot,
  gemini: Sparkles,
  custom: Sliders,
};

export function ProviderCard({
  id,
  title,
  description,
  model,
  baseUrl,
  isActive,
  isSelected,
  apiKeyConfigured,
  requiresKey,
  onSelect,
  onActivate,
}: ProviderCardProps) {
  const Icon = PROVIDER_ICONS[id] || Sparkles;

  return (
    <div
      onClick={onSelect}
      className={`rounded-3xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between relative select-none ${
        isActive
          ? "bg-white dark:bg-slate-900 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/30 dark:ring-indigo-500/40 shadow-lg shadow-indigo-950/10"
          : isSelected
          ? "bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-800 shadow-md"
          : "bg-white/70 dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
      }`}
    >
      <div className="space-y-3.5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              isActive
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {isActive && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Ativo</span>
              </span>
            )}

            {requiresKey && (
              apiKeyConfigured ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Chave salva</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <KeyRound className="w-3 h-3" />
                  <span>Requer chave</span>
                </span>
              )
            )}

            {id === "openrouter" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                <Sparkles className="w-3 h-3" />
                <span>Padrão Inicial</span>
              </span>
            )}

            {!requiresKey && id === "ollama" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                100% Local
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Info pills */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Modelo:</span>
            <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[10px] truncate max-w-[170px]">
              {model || "Não definido"}
            </code>
          </div>

          {baseUrl && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              <span className="font-semibold text-slate-400">Endpoint:</span>
              <span className="truncate font-mono text-[10px] text-slate-600 dark:text-slate-400">
                {baseUrl}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {isSelected ? "Em edição" : "Clique para editar"}
        </span>

        {isActive ? (
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <span>Provedor atual</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 transition cursor-pointer active:scale-95"
          >
            <span>Selecionar</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
