"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileWarning,
  ArrowLeft,
  RefreshCw,
  Settings,
  Play,
  Square,
  Sparkles,
  Bot,
  Layers,
  Shield,
} from "lucide-react";
import type { StudyPage } from "@/types/study";
import type {
  PageAnalysis,
  PageProcessingError,
  StudyAnalysis,
} from "@/lib/ai/schema";
import { consolidateStudyResults } from "@/lib/ai/schema";

interface StudyProcessingViewProps {
  pages: StudyPage[];
  studyTitle?: string;
  onComplete: (analysis: StudyAnalysis) => void;
  onCancel: () => void;
}

export function StudyProcessingView({
  pages,
  studyTitle,
  onComplete,
  onCancel,
}: StudyProcessingViewProps) {
  const [statusMessage, setStatusMessage] = useState<string>(
    "Iniciando leitura inteligente das páginas..."
  );
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [completedAnalyses, setCompletedAnalyses] = useState<PageAnalysis[]>([]);
  const [pageErrors, setPageErrors] = useState<PageProcessingError[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [isCanceled, setIsCanceled] = useState<boolean>(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const totalPages = pages.length;

  // 1. Iniciar ou continuar processamento real página por página
  const startProcessingFrom = useCallback(
    async (startIndex: number, existingAnalyses: PageAnalysis[], existingErrors: PageProcessingError[]) => {
      setIsProcessing(true);
      setIsCanceled(false);
      setFatalError(null);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const currentAnalyses = [...existingAnalyses];
        const currentErrors = [...existingErrors];

        // Passo 2: Processar sequencialmente cada página
        for (let i = startIndex; i < totalPages; i++) {
          if (abortController.signal.aborted) {
            break;
          }

          const pageNumber = i + 1;
          const pageItem = pages[i];
          setCurrentPageIndex(i);
          setStatusMessage(`Lendo a página ${pageNumber} de ${totalPages}...`);

          // Executar chamada à rota individual /api/ai/analyze-page
          try {
            const formData = new FormData();
            formData.append("file", pageItem.file);
            formData.append("pageNumber", String(pageNumber));

            const response = await fetch("/api/ai/analyze-page", {
              method: "POST",
              body: formData,
              signal: abortController.signal,
            });

            if (!response.ok) {
              const errBody = await response.json().catch(() => ({}));
              const errMessage =
                errBody?.error?.message || `Erro HTTP ${response.status} ao processar página ${pageNumber}`;
              const errCode = errBody?.error?.code || "PAGE_ERROR";

              // Erro crítico de provedor ou visão não suportada interrompe com erro fatal
              if (response.status === 422 || response.status === 503) {
                setFatalError(errMessage);
                setIsProcessing(false);
                return;
              }

              // Registrar erro individual sem quebrar as outras páginas
              currentErrors.push({
                pageNumber,
                code: errCode,
                message: errMessage,
              });
              setPageErrors([...currentErrors]);
              setStatusMessage(`Página ${pageNumber} apresentou falha: ${errMessage}`);
            } else {
              const resJson = await response.json();
              if (resJson.success && resJson.data) {
                currentAnalyses.push(resJson.data);
                setCompletedAnalyses([...currentAnalyses]);
                setStatusMessage(`Página ${pageNumber} concluída.`);
              }
            }
          } catch (err: unknown) {
            if (abortController.signal.aborted) {
              break;
            }
            const message = err instanceof Error ? err.message : String(err);
            currentErrors.push({
              pageNumber,
              code: "NETWORK_ERROR",
              message,
            });
            setPageErrors([...currentErrors]);
            setStatusMessage(`Erro de rede na página ${pageNumber}.`);
          }

          // Breve pausa para garantir sequência fluida e não sobrecarregar
          if (i + 1 < totalPages && !abortController.signal.aborted) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }

        // Passo 3: Conclusão se não foi cancelado
        if (!abortController.signal.aborted) {
          setStatusMessage("Consolidando resultados da leitura...");
          const consolidated = consolidateStudyResults(totalPages, currentAnalyses, currentErrors);

          // Breve celebração e avanço
          setTimeout(() => {
            onComplete(consolidated);
          }, 600);
        }
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          setFatalError(
            err instanceof Error
              ? err.message
              : "Não foi possível conectar ao modelo configurado. Verifique o provider e tente novamente nas configurações de IA."
          );
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [pages, totalPages, onComplete]
  );

  useEffect(() => {
    startProcessingFrom(0, [], []);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [startProcessingFrom]);

  // Cancelamento pelo usuário
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    setIsCanceled(true);
    setStatusMessage("Processamento interrompido pelo usuário.");
  };

  // Continuar processamento de onde parou
  const handleResume = () => {
    const nextIndex = completedAnalyses.length + pageErrors.length;
    if (nextIndex < totalPages) {
      startProcessingFrom(nextIndex, completedAnalyses, pageErrors);
    } else {
      // Se já estava no final, apenas consolida
      const consolidated = consolidateStudyResults(totalPages, completedAnalyses, pageErrors);
      onComplete(consolidated);
    }
  };

  // Reiniciar do zero
  const handleRestart = () => {
    setCompletedAnalyses([]);
    setPageErrors([]);
    startProcessingFrom(0, [], []);
  };

  // Cálculo percentual real
  const processedCount = completedAnalyses.length + pageErrors.length;
  const progressPercent = totalPages > 0 ? Math.round((processedCount / totalPages) * 100) : 0;

  return (
    <div className="w-full max-w-[680px] mx-auto animate-in fade-in duration-300">
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-indigo-950/5 dark:shadow-black/50 p-5 sm:p-8 space-y-6">
        
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-2xs">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {totalPages} {totalPages === 1 ? "página em processamento" : "páginas em processamento"}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Leitura Inteligente das Páginas
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            Extraindo textos, títulos, fórmulas e conceitos utilizando o modelo multimodal configurado.
          </p>

        </div>

        {/* Estado de Erro Fatal / Provider Indisponível */}
        {fatalError && (
          <div className="rounded-2xl p-5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-950 dark:text-rose-100">
                  Não foi possível conectar ao provedor de IA
                </h4>
                <p className="text-xs text-rose-900 dark:text-rose-300 leading-relaxed">
                  {fatalError}
                </p>
                <p className="text-[11px] text-rose-800 dark:text-rose-400">
                  Solicite ao administrador que verifique a chave de API e o modelo ativo no painel administrativo.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-rose-200/60 dark:border-rose-900/60">
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar novamente</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar às páginas</span>
              </button>

              <Link
                href="/admin/configuracoes/ia"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Painel do Administrador</span>
              </Link>
            </div>
          </div>
        )}

        {/* Barra de Progresso Real */}
        {!fatalError && (
          <div className="space-y-2 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400 motion-reduce:animate-none" />
                ) : isCanceled ? (
                  <FileWarning className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span className="truncate max-w-[240px] sm:max-w-md">{statusMessage}</span>
              </span>
              <span className="tabular-nums font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                {progressPercent}%
              </span>
            </div>

            {/* Barra Visual */}
            <div
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5"
            >
              <div
                className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-500 shadow-sm shadow-indigo-500/30"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Contadores */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                {completedAnalyses.length} de {totalPages} concluídas
              </span>
              {pageErrors.length > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {pageErrors.length} com falha
                </span>
              )}
            </div>
          </div>
        )}

        {/* Anúncio de Acessibilidade */}
        <div className="sr-only" aria-live="polite">
          {statusMessage} Progresso atual: {progressPercent}%.
        </div>

        {/* Estado Interrompido / Cancelado */}
        {isCanceled && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-center space-y-3 animate-in fade-in">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Processamento pausado. As {completedAnalyses.length} páginas já lidas foram preservadas.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleResume}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Continuar leitura</span>
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recomeçar</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar às páginas</span>
              </button>
            </div>
          </div>
        )}

        {/* Botão de Cancelamento em Tempo Real */}
        {isProcessing && !fatalError && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Cancelar processamento</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
