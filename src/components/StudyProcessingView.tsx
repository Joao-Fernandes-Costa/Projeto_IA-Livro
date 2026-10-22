"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Loader2,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { PREPARATION_STEPS, STUDY_MESSAGES } from "@/lib/constants";
import type { PreparationStepState } from "@/types/study";

/**
 * SIMULAÇÃO: Processamento simulado nesta etapa conforme especificação do projeto.
 * Não realiza chamadas para APIs de IA (Gemini), OCR ou banco de dados.
 * Os timers são controlados e rigorosamente cancelados na desmontagem do componente.
 */

interface StudyProcessingViewProps {
  pagesCount: number;
  studyTitle?: string;
  onComplete: () => void;
  onCancel?: () => void;
}

export function StudyProcessingView({
  pagesCount,
  studyTitle,
  onComplete,
  onCancel,
}: StudyProcessingViewProps) {
  const [progress, setProgress] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    PREPARATION_STEPS[0].inProgressMessage
  );

  // Referência para controlar todos os timers ativos e prevenir vazamento de memória
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => {
    // Configura o ciclo progressivo das 4 etapas
    // Etapa 1: 0% -> 25%
    // Etapa 2: 25% -> 50%
    // Etapa 3: 50% -> 75%
    // Etapa 4: 75% -> 100%

    // Intervalo de animação fluida da barra de progresso
    let currentVal = 0;
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Incrementos graduais
        if (prev < 25) {
          currentVal = Math.min(25, prev + 2);
          setCurrentStepIndex(0);
          setStatusMessage(PREPARATION_STEPS[0].inProgressMessage);
        } else if (prev < 50) {
          currentVal = Math.min(50, prev + 2);
          setCurrentStepIndex(1);
          setStatusMessage(PREPARATION_STEPS[1].inProgressMessage);
        } else if (prev < 75) {
          currentVal = Math.min(75, prev + 2);
          setCurrentStepIndex(2);
          setStatusMessage(PREPARATION_STEPS[2].inProgressMessage);
        } else if (prev < 100) {
          currentVal = Math.min(100, prev + 2);
          setCurrentStepIndex(3);
          setStatusMessage(PREPARATION_STEPS[3].inProgressMessage);
        } else {
          currentVal = 100;
        }

        if (currentVal >= 100) {
          clearInterval(progressInterval);
          setIsCompleted(true);
          setStatusMessage(STUDY_MESSAGES.COMPLETED_SUBTITLE);

          // Transição automática suave para o ambiente de estudo após breve celebração
          const completeTimeout = setTimeout(() => {
            onComplete();
          }, 850);
          timersRef.current.push(completeTimeout);
        }

        return currentVal;
      });
    }, 80);

    timersRef.current.push(progressInterval as unknown as NodeJS.Timeout);

    return () => {
      clearInterval(progressInterval);
      clearAllTimers();
    };
  }, [onComplete]);

  // Determinar o estado de cada etapa (waiting, in_progress, completed)
  const getStepState = (index: number): PreparationStepState => {
    if (isCompleted || index < currentStepIndex) return "completed";
    if (index === currentStepIndex) return "in_progress";
    return "waiting";
  };

  return (
    <div className="w-full max-w-[680px] mx-auto animate-in fade-in duration-300">
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-indigo-950/5 dark:shadow-black/50 p-5 sm:p-8 space-y-6">
        
        {/* Cabeçalho do Processamento */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-2xs">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {pagesCount} {pagesCount === 1 ? "página selecionada" : "páginas selecionadas"}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isCompleted ? STUDY_MESSAGES.COMPLETED_TITLE : STUDY_MESSAGES.PROCESSING_TITLE}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            {isCompleted
              ? STUDY_MESSAGES.COMPLETED_SUBTITLE
              : STUDY_MESSAGES.PROCESSING_SUBTITLE}
          </p>

          {studyTitle && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium italic pt-1 truncate max-w-sm mx-auto">
              &ldquo;{studyTitle}&rdquo;
            </p>
          )}
        </div>

        {/* Barra de Progresso com Indicador Numérico */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              {!isCompleted ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400 motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              )}
              <span className="truncate max-w-[240px] sm:max-w-md">{statusMessage}</span>
            </span>
            <span className="tabular-nums font-bold text-indigo-600 dark:text-indigo-400 text-sm">
              {progress}%
            </span>
          </div>

          {/* Barra Visual */}
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso da preparação do material"
            className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5"
          >
            <div
              className={`h-full rounded-full transition-all duration-150 ease-out ${
                isCompleted
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/30"
                  : "bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-500 shadow-sm shadow-indigo-500/30"
              } motion-reduce:transition-none`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Anúncio acessível para leitores de tela */}
        <div className="sr-only" aria-live="polite">
          Progresso: {progress} por cento. {statusMessage}.
        </div>

        {/* Lista das 4 Etapas com estados visuais */}
        <div className="space-y-2.5">
          {PREPARATION_STEPS.map((step, idx) => {
            const state = getStepState(idx);
            const isCurrent = state === "in_progress";
            const isDone = state === "completed";
            const isPending = state === "waiting";

            return (
              <div
                key={step.id}
                className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 ${
                  isCurrent
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 ring-2 ring-indigo-200/50 dark:ring-indigo-950/50"
                    : isDone
                    ? "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/40 text-slate-800 dark:text-slate-200"
                    : "bg-slate-50/60 dark:bg-slate-950/30 border-slate-200/60 dark:border-slate-800/60 text-slate-400 dark:text-slate-600 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Ícone de Estado */}
                  <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl">
                    {isDone && (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      </div>
                    )}
                    {isPending && (
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* Textos da Etapa */}
                  <div className="space-y-0.5">
                    <span
                      className={`text-xs sm:text-sm font-semibold block ${
                        isCurrent
                          ? "text-indigo-950 dark:text-indigo-200"
                          : isDone
                          ? "text-slate-800 dark:text-slate-200"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {step.title}
                    </span>
                    <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block">
                      {isDone
                        ? step.completedMessage
                        : isCurrent
                        ? step.inProgressMessage
                        : `Aguardando etapa anterior (${step.startProgress}%)`}
                    </span>
                  </div>
                </div>

                {/* Badge de status lateral */}
                <div className="shrink-0 pl-2">
                  {isDone && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Concluída
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Em andamento
                    </span>
                  )}
                  {isPending && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                      Aguardando
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé do Processamento: Ação imediata caso concluído ou botão de retorno */}
        {isCompleted && (
          <div className="pt-2 flex justify-center animate-in fade-in duration-200">
            <button
              type="button"
              onClick={onComplete}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>Acessar ambiente preparado</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Nota explicativa de simulação segura */}
        <p className="text-center text-[11px] text-slate-600 dark:text-slate-400 font-medium">
          Simulação de preparação • Seus arquivos permanecem seguros no navegador.
        </p>
      </div>
    </div>
  );
}
