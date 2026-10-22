"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Award,
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import { QuizPublic, QuizEvaluationResult } from "@/lib/quiz/schema";

interface QuizGameProps {
  quiz: QuizPublic;
  onBackToStudy?: () => void;
  onRegenerateQuiz?: () => void;
}

export function QuizGame({ quiz, onBackToStudy, onRegenerateQuiz }: QuizGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<QuizEvaluationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const questions = quiz.questions;
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setEvalError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/quiz/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.quizId,
          answers: selectedAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao avaliar respostas.");
      }

      setEvaluation(data);
    } catch (err: unknown) {
      setEvalError(err instanceof Error ? err.message : "Erro ao enviar respostas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setEvaluation(null);
    setEvalError(null);
    setCurrentIndex(0);
  };

  // 1. TELA DE RESULTADOS E CORREÇÃO COMENTADA
  if (evaluation) {
    const isPassing = evaluation.percentage >= 60;
    const isTop = evaluation.percentage >= 80;

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Banner do Resultado */}
        <div
          className={`rounded-3xl p-6 sm:p-8 border shadow-sm ${
            isTop
              ? "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-300 dark:border-emerald-800"
              : isPassing
              ? "bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-300 dark:border-indigo-800"
              : "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-300 dark:border-amber-800"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                  isTop
                    ? "bg-emerald-500 text-white"
                    : isPassing
                    ? "bg-indigo-600 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                <Award className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Resultado do Questionário
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {isTop
                    ? "Excelente aproveitamento!"
                    : isPassing
                    ? "Bom desempenho!"
                    : "Recomendamos revisar o material"}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Você acertou{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {evaluation.score}
                  </strong>{" "}
                  de{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {evaluation.total}
                  </strong>{" "}
                  questões.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {evaluation.percentage}%
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                Taxa de Acerto
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-98 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Refazer questionário</span>
            </button>

            {onBackToStudy && (
              <button
                type="button"
                onClick={onBackToStudy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition active:scale-98 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Voltar ao texto do estudo</span>
              </button>
            )}

            {onRegenerateQuiz && (
              <button
                type="button"
                onClick={onRegenerateQuiz}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition active:scale-98 cursor-pointer ml-auto"
              >
                <Sparkles className="w-4 h-4" />
                <span>Gerar novas questões</span>
              </button>
            )}
          </div>
        </div>

        {/* Detalhamento de cada questão com gabarito e explicação */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
            <span>Revisão e Gabarito Comentado</span>
            <span className="text-xs font-normal lowercase text-slate-400">
              {evaluation.total} questões analisadas
            </span>
          </h4>

          <div className="space-y-4">
            {questions.map((q, qIndex) => {
              const res = evaluation.results.find((r) => r.questionId === q.id);
              const isCorrect = res ? res.correct : false;
              const selectedOpt = res ? res.selectedOptionId : selectedAnswers[q.id];
              const correctOpt = res ? res.correctOptionId : "";
              const explanationText = res ? res.explanation : "";

              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border p-5 transition bg-white dark:bg-slate-900 ${
                    isCorrect
                      ? "border-emerald-300 dark:border-emerald-800/80 shadow-sm"
                      : "border-red-300 dark:border-red-800/80 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Questão {qIndex + 1}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isCorrect
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300"
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Acertou</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>Errou</span>
                          </>
                        )}
                      </span>
                      {q.sourcePages && q.sourcePages.length > 0 && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          Pág. {q.sourcePages.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug mb-4">
                    {q.question}
                  </p>

                  {/* Alternativas */}
                  <div className="space-y-2 mb-4">
                    {q.options.map((opt) => {
                      const optId = opt.id.toLowerCase();
                      const isThisCorrect = optId === correctOpt.toLowerCase();
                      const isThisSelected = optId === selectedOpt?.toLowerCase();

                      let optClass =
                        "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300";
                      let badge = null;

                      if (isThisCorrect) {
                        optClass =
                          "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500";
                        badge = (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold ml-auto flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Gabarito correto
                          </span>
                        );
                      } else if (isThisSelected && !isThisCorrect) {
                        optClass =
                          "border-red-500 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200 font-semibold ring-1 ring-red-500";
                        badge = (
                          <span className="text-[11px] text-red-600 dark:text-red-400 font-bold ml-auto flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Sua escolha
                          </span>
                        );
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm ${optClass}`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 uppercase ${
                              isThisCorrect
                                ? "bg-emerald-600 text-white"
                                : isThisSelected
                                ? "bg-red-600 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span className="leading-snug">{opt.text}</span>
                          {badge}
                        </div>
                      );
                    })}
                  </div>

                  {/* Justificativa e Explicação */}
                  {explanationText && (
                    <div className="rounded-xl p-3.5 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Explicação didática:</span>
                      </div>
                      <p>{explanationText}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 2. TELA INTERATIVA DE RESPOSTAS (QUESTÃO POR QUESTÃO)
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header do Quiz */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Sparkles className="w-3 h-3" />
                <span>Questionário Interativo EstudeAI</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                • Conteúdo real das páginas
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {quiz.title || "Questionário de Fixação"}
            </h3>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              Respondidas: {answeredCount}/{totalQuestions}
            </span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Questão <strong>{currentIndex + 1}</strong> de <strong>{totalQuestions}</strong>
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Seletor rápido de questões */}
        <div className="flex items-center gap-1.5 pt-4 overflow-x-auto pb-1">
          {questions.map((q, idx) => {
            const isAnswered = Boolean(selectedAnswers[q.id]);
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer ${
                  isCurrent
                    ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900"
                    : isAnswered
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                title={`Ir para questão ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card da Questão Atual */}
      {currentQuestion && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Questão {currentIndex + 1}
              </span>
              {currentQuestion.difficulty && (
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    currentQuestion.difficulty === "easy"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : currentQuestion.difficulty === "hard"
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {currentQuestion.difficulty === "easy"
                    ? "Fácil"
                    : currentQuestion.difficulty === "hard"
                    ? "Difícil"
                    : "Média"}
                </span>
              )}
            </div>

            {currentQuestion.sourcePages && currentQuestion.sourcePages.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Baseado na(s) página(s):{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {currentQuestion.sourcePages.join(", ")}
                </strong>
              </span>
            )}
          </div>

          <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
            {currentQuestion.question}
          </h4>

          {/* Lista das 4 alternativas com seleção visual */}
          <div className="space-y-3">
            {currentQuestion.options.map((opt) => {
              const optId = opt.id.toLowerCase();
              const isSelected = selectedAnswers[currentQuestion.id] === optId;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(currentQuestion.id, optId)}
                  className={`w-full text-left flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-sm ring-1 ring-indigo-500"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 uppercase transition ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {opt.id}
                  </span>
                  <div className="flex-1 text-xs sm:text-sm leading-relaxed pt-0.5">
                    {opt.text}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Erro ao avaliar (se houver) */}
          {evalError && (
            <div className="rounded-2xl p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong>Erro na avaliação:</strong> {evalError}
              </div>
            </div>
          )}

          {/* Navegação entre questões e botão de envio */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  currentIndex === 0
                    ? "opacity-40 cursor-not-allowed text-slate-400 bg-slate-100 dark:bg-slate-800"
                    : "text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              {currentIndex < totalQuestions - 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                >
                  <span>Próxima</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmitQuiz}
              disabled={isSubmitting || answeredCount === 0}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-98 cursor-pointer ${
                answeredCount === 0 || isSubmitting
                  ? "bg-indigo-400 dark:bg-indigo-900/50 text-white/70 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Avaliando respostas...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Finalizar e Avaliar ({answeredCount}/{totalQuestions})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
