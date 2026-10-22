"use client";

import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Code2,
  FileWarning,
  Sparkles,
} from "lucide-react";
import type { AIHealthResult } from "@/types/ai";

interface ConnectionTestResultProps {
  result: AIHealthResult | null;
  isLoading: boolean;
}

export function ConnectionTestResult({ result, isLoading }: ConnectionTestResultProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
          Testando conexão e inspecionando capacidades do modelo...
        </p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 space-y-3.5 ${
        result.success
          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
          : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800"
      }`}
    >
      {/* Cabeçalho do Resultado */}
      <div className="flex items-start gap-3">
        {result.success ? (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        )}

        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className={`text-sm font-bold ${
                result.success
                  ? "text-emerald-950 dark:text-emerald-100"
                  : "text-rose-950 dark:text-rose-100"
              }`}
            >
              {result.success ? "Conexão estabelecida com sucesso" : "Falha na verificação do provedor"}
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              {result.provider} • {result.model}
            </span>
          </div>

          <p
            className={`text-xs leading-relaxed font-medium ${
              result.success
                ? "text-emerald-900 dark:text-emerald-300"
                : "text-rose-900 dark:text-rose-300"
            }`}
          >
            {result.message}
          </p>
        </div>
      </div>

      {/* Grid de Capacidades do Modelo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
        {/* Capacidade de Visão */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            {result.supportsVision ? (
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-amber-500" />
            )}
            <span>Suporte a Imagens (Visão)</span>
          </span>

          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              result.supportsVision
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {result.supportsVision ? "Compatível" : "Sem suporte"}
          </span>
        </div>

        {/* Capacidade de Saída Estruturada */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Saída Estruturada (JSON)</span>
          </span>

          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              result.supportsStructuredOutput
                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {result.supportsStructuredOutput ? "Suportado" : "Básico"}
          </span>
        </div>
      </div>

      {/* Alerta Obrigatório caso o modelo não suporte visão */}
      {!result.supportsVision && (
        <div className="rounded-xl p-3 bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 animate-in fade-in">
          <FileWarning className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed font-semibold">
            O modelo selecionado não possui suporte para imagens e não pode ler páginas de livros.
            <span className="block font-normal text-amber-900 dark:text-amber-300 text-[11px] mt-0.5">
              Escolha um modelo multimodal (ex.: qwen2.5vl, gpt-4o-mini ou gemini-1.5-flash) para processar fotos e documentos físicos.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
