"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  FileText,
  Headphones,
  CheckSquare,
  ArrowLeft,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Copy,
  Check,
  Eye,
  Loader2,
  AlertCircle,
  Video,
  Volume2,
} from "lucide-react";
import type { StudyPage } from "@/types/study";
import type { StudyAnalysis } from "@/lib/ai/schema";
import { formatFileSize } from "@/lib/utils";
import { QuizPublic } from "@/lib/quiz/schema";
import { StudyMediaPackage } from "@/lib/lecture/schema";
import { QuizGame } from "./QuizGame";
import { AudiobookPlayer } from "./AudiobookPlayer";
import { ExplanatoryVideoPlayer } from "./ExplanatoryVideoPlayer";
import { AudioExplanation } from "./AudioExplanation";

interface StudyWorkspacePreviewProps {
  pages: StudyPage[];
  studyTitle: string;
  analysis?: StudyAnalysis | null;
  onBackToPages: () => void;
}

export function StudyWorkspacePreview({
  pages,
  studyTitle,
  analysis,
  onBackToPages,
}: StudyWorkspacePreviewProps) {
  const [showPagesList, setShowPagesList] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estados do Questionário Interativo
  const [quizData, setQuizData] = useState<QuizPublic | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Estados da Explicação em Áudio Didática
  const [audioData, setAudioData] = useState<{
    script: string;
    durationEstimate: number;
    wordCount: number;
  } | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Estados do Pacote de Mídia (Audiobook + Vídeo Explicativo)
  const [mediaData, setMediaData] = useState<StudyMediaPackage | null>(null);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Aba ativa
  const [activeTab, setActiveTab] = useState<
    "text" | "audio" | "audiobook" | "video" | "quiz"
  >("text");

  const pagesCount = pages.length;
  const displayTitle = studyTitle.trim() || "Material de Estudo Personalizado";

  const totalPages = pagesCount;
  const processedPages =
    analysis?.processedPages ?? (analysis?.pageAnalyses?.length || 0);
  const failedPages = analysis?.failedPages ?? totalPages - processedPages;
  const hasAnalysis = Boolean(
    analysis && analysis.pageAnalyses && analysis.pageAnalyses.length > 0
  );
  const confidencePercent = analysis
    ? Math.round(analysis.averageConfidence * 100)
    : 95;

  let readingStatus: {
    label: string;
    badgeClass: string;
    dotClass: string;
  };

  if (processedPages === totalPages && failedPages === 0) {
    readingStatus = {
      label: "Leitura concluída",
      badgeClass:
        "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
    };
  } else if (processedPages > 0) {
    readingStatus = {
      label: "Leitura concluída com falhas",
      badgeClass:
        "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      dotClass: "bg-amber-500",
    };
  } else {
    readingStatus = {
      label: "Falha na leitura",
      badgeClass:
        "bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      dotClass: "bg-rose-500",
    };
  }

  const handleCopyText = () => {
    if (analysis?.fullText) {
      navigator.clipboard.writeText(analysis.fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!analysis) return;
    setIsGeneratingQuiz(true);
    setQuizError(null);

    try {
      const res = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyAnalysis: analysis }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error || "Falha ao gerar o questionário interativo."
        );
      }

      setQuizData(data.quiz);
      setActiveTab("quiz");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro inesperado ao gerar o questionário.";
      setQuizError(msg);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!analysis) return;
    setIsGeneratingAudio(true);
    setAudioError(null);

    try {
      const res = await fetch("/api/ai/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyAnalysis: analysis, mode: "browser" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao gerar o roteiro de áudio explicativo.");
      }

      setAudioData({
        script: data.script,
        durationEstimate: data.durationEstimate,
        wordCount: data.wordCount,
      });
      setActiveTab("audio");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao gerar a explicação em áudio.";
      setAudioError(msg);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerateMedia = async (targetTab: "audiobook" | "video") => {
    if (!analysis) return;
    if (mediaData) {
      setActiveTab(targetTab);
      return;
    }

    setIsGeneratingMedia(true);
    setMediaError(null);

    try {
      const res = await fetch("/api/ai/generate-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyAnalysis: analysis }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.media) {
        throw new Error(
          data.error || "Falha ao gerar o audiobook e o vídeo explicativo."
        );
      }

      setMediaData(data.media);
      setActiveTab(targetTab);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro inesperado ao gerar o audiobook e vídeo.";
      setMediaError(msg);
    } finally {
      setIsGeneratingMedia(false);
    }
  };

  return (
    <div className="w-full max-w-[880px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 1. Cabeçalho do Ambiente de Estudo */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xl shadow-indigo-950/5 dark:shadow-black/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${readingStatus.badgeClass}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${readingStatus.dotClass} animate-pulse`}
                />
                <span>{readingStatus.label}</span>
              </span>

              {hasAnalysis && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confiança média: {confidencePercent}%</span>
                </span>
              )}

              {failedPages > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{failedPages} com falha</span>
                </span>
              ) : null}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {displayTitle}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              {processedPages === 0
                ? "Nenhuma página pôde ser transcrita com sucesso. Revise os erros abaixo ou tente outro modelo."
                : `${processedPages} de ${totalPages} páginas processadas e transcritas com sucesso.`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            {/* CTA de Áudio no Header */}
            {hasAnalysis && !audioData && (
              <button
                type="button"
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                title="Gerar narração didática do material"
              >
                {isGeneratingAudio ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Gerando áudio...</span>
                  </>
                ) : (
                  <>
                    <Headphones className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Ouvir áudio</span>
                  </>
                )}
              </button>
            )}

            {hasAnalysis && !quizData && (
              <button
                type="button"
                onClick={handleGenerateQuiz}
                disabled={isGeneratingQuiz}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition active:scale-98 cursor-pointer disabled:opacity-60"
              >
                {isGeneratingQuiz ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando Quiz...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Gerar Quiz</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onBackToPages}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition cursor-pointer active:scale-98"
              title="Voltar e revisar as páginas originais"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar às páginas</span>
            </button>
          </div>
        </div>

        {/* Resumo das Miniaturas */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowPagesList((prev) => !prev)}
            className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 transition py-1 text-left cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Ver as {pagesCount} páginas originais do estudo</span>
            </span>
            {showPagesList ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showPagesList && (
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 animate-in fade-in duration-200">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1.5 flex flex-col items-center"
                >
                  <div className="w-full aspect-[3/4] relative rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                    <Image
                      src={p.previewUrl}
                      alt={`Página ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    />
                    <span className="absolute top-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      #{idx + 1}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full text-center mt-1">
                    {formatFileSize(p.sizeBytes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alertas de erro */}
      {(quizError || audioError || mediaError) && (
        <div className="rounded-2xl p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs sm:text-sm text-red-800 dark:text-red-300 flex items-start gap-3 shadow-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold">Atenção:</strong>
            <p className="leading-relaxed">{quizError || audioError || mediaError}</p>
          </div>
        </div>
      )}

      {/* 2. ABAS DE NAVEGAÇÃO DO ESTUDO (Aparecem quando o estudo é processado com sucesso) */}
      {hasAnalysis && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === "text"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Texto e Resumo</span>
          </button>

          {/* Aba: Explicação em Áudio */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("audio");
              if (!audioData && !isGeneratingAudio) {
                handleGenerateAudio();
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === "audio"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            }`}
          >
            {isGeneratingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Headphones className="w-4 h-4" />
            )}
            <span>
              Explicação em áudio {audioData ? `(~${Math.ceil(audioData.durationEstimate / 60)} min)` : ""}
            </span>
          </button>

          {/* Aba: Audiobook */}
          <button
            type="button"
            onClick={() => handleGenerateMedia("audiobook")}
            disabled={isGeneratingMedia}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50 ${
              activeTab === "audiobook"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            }`}
          >
            {isGeneratingMedia ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Headphones className="w-4 h-4" />
            )}
            <span>
              {mediaData
                ? `Audiobook (${mediaData.audiobookChapters.length} faixas)`
                : "Audiobook Explicativo"}
            </span>
          </button>

          {/* Aba: Vídeo Explicativo */}
          <button
            type="button"
            onClick={() => handleGenerateMedia("video")}
            disabled={isGeneratingMedia}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50 ${
              activeTab === "video"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
          >
            {isGeneratingMedia ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Video className="w-4 h-4" />
            )}
            <span>
              {mediaData
                ? `Vídeo-Aula (${mediaData.videoScenes.length} slides)`
                : "Vídeo Explicativo"}
            </span>
          </button>

          {/* Aba: Questionário */}
          <button
            type="button"
            onClick={() => {
              if (quizData) {
                setActiveTab("quiz");
              } else {
                handleGenerateQuiz();
              }
            }}
            disabled={isGeneratingQuiz}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50 ${
              activeTab === "quiz"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            }`}
          >
            {isGeneratingQuiz ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckSquare className="w-4 h-4" />
            )}
            <span>
              {quizData
                ? `Questionário (${quizData.totalQuestions} questões)`
                : "Gerar Questionário"}
            </span>
          </button>
        </div>
      )}

      {/* 3. CONTEÚDO DAS ABAS */}
      {activeTab === "audio" ? (
        audioData ? (
          <AudioExplanation
            script={audioData.script}
            durationEstimate={audioData.durationEstimate}
            studyTitle={displayTitle}
            onBackToStudy={() => setActiveTab("text")}
            onRegenerateAudio={handleGenerateAudio}
          />
        ) : (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-5 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200 dark:border-indigo-800 shadow-sm">
              <Headphones className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Ouça uma explicação do seu material
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Transforme o texto das páginas transcritas em um roteiro falado dinâmico de 3 a 5 minutos,
                com sintetizador de voz natural em português brasileiro.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGeneratingAudio ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando roteiro de áudio com IA...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Gerar e ouvir explicação agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )
      ) : activeTab === "audiobook" && mediaData ? (
        <AudiobookPlayer
          media={mediaData}
          onBackToStudy={() => setActiveTab("text")}
        />
      ) : activeTab === "video" && mediaData ? (
        <ExplanatoryVideoPlayer
          media={mediaData}
          pages={pages}
          onBackToStudy={() => setActiveTab("text")}
        />
      ) : activeTab === "quiz" && quizData ? (
        <QuizGame
          quiz={quizData}
          onBackToStudy={() => setActiveTab("text")}
          onRegenerateQuiz={handleGenerateQuiz}
        />
      ) : (
        <>
          {/* Cartão Ativo: Texto e Resumo Processado com IA */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-500/80 dark:border-indigo-500/60 p-5 sm:p-7 shadow-xl shadow-indigo-950/10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Texto e Resumo das Páginas
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Disponível</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Extração integral do texto do livro físico e síntese
                    conceitual estruturada.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  disabled={!analysis?.fullText}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar texto</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFullText((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {showFullText ? "Recolher transcrição" : "Ver texto completo"}
                  </span>
                </button>
              </div>
            </div>

            {/* Resumos por Página */}
            {hasAnalysis && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Síntese Didática por Página
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  {analysis?.pageAnalyses.map((pageAnalysis) => (
                    <div
                      key={pageAnalysis.pageNumber}
                      className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>
                            Página {pageAnalysis.pageNumber}
                            {pageAnalysis.title
                              ? ` — ${pageAnalysis.title}`
                              : ""}
                          </span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {Math.round(pageAnalysis.confidence * 100)}% confiança
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {pageAnalysis.summary}
                      </p>

                      {pageAnalysis.importantConcepts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {pageAnalysis.importantConcepts.map((concept, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exibição Expandida do Texto Completo Transcrito */}
            {showFullText && analysis?.fullText && (
              <div className="rounded-2xl p-4 sm:p-5 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed space-y-3 overflow-x-auto max-h-[420px] overflow-y-auto animate-in fade-in duration-200 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
                  <span className="text-[11px] font-sans font-bold text-indigo-400">
                    Transcrição Fiel do Livro
                  </span>
                  <span>{analysis.fullText.length} caracteres</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-200">
                  {analysis.fullText}
                </pre>
              </div>
            )}

            {/* Páginas que Falharam (se houver) */}
            {analysis?.errors && analysis.errors.length > 0 && (
              <div className="rounded-2xl p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-1.5">
                <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Atenção nas seguintes páginas:</span>
                </h5>
                <ul className="text-xs text-amber-800 dark:text-amber-300 list-disc list-inside space-y-0.5">
                  {analysis.errors.map((err, i) => (
                    <li key={i}>
                      Página {err.pageNumber}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 4. Grid de Módulos (Explicação em Áudio + Audiobook + Vídeo + Quiz) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Módulos Educacionais Disponíveis
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Explicação em Áudio (Roteiro Didático Falado) */}
              <div
                className={`rounded-3xl bg-white dark:bg-slate-900 border p-5 flex flex-col justify-between shadow-sm transition ${
                  audioData
                    ? "border-indigo-400 dark:border-indigo-700 ring-1 ring-indigo-400/30"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                      <Headphones className="w-5 h-5" aria-hidden="true" />
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        audioData
                          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                      }`}
                    >
                      <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                      <span>{audioData ? "Áudio Pronto" : "Disponível com IA"}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Explicação em áudio
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                      Narração guiada em áudio para ouvir no seu ritmo enquanto revisa, com roteiro
                      estruturado de 3 a 5 minutos a partir do livro.
                    </p>
                  </div>

                  <ul className="space-y-1 pt-1">
                    <li className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-indigo-500" />
                      <span>Roteiro didático completo e natural</span>
                    </li>
                    <li className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-indigo-500" />
                      <span>Controle de velocidade (0.75x a 2x)</span>
                    </li>
                    <li className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-indigo-500" />
                      <span>Síntese de voz em português brasileiro</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
                  {audioData ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("audio")}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-98 cursor-pointer"
                    >
                      <Headphones className="w-4 h-4" />
                      <span>Ouvir explicação (~{Math.ceil(audioData.durationEstimate / 60)} min)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateAudio}
                      disabled={isGeneratingAudio || !hasAnalysis}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingAudio ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gerando áudio...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Gerar explicação em áudio</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: Audiobook Completo */}
              <div
                className={`rounded-3xl bg-white dark:bg-slate-900 border p-5 flex flex-col justify-between shadow-sm transition ${
                  mediaData
                    ? "border-indigo-400 dark:border-indigo-700 ring-1 ring-indigo-400/30"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{mediaData ? "Audiobook Pronto" : "Voz Neural"}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Audiobook Didático
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                      Narração em capítulos com velocidade ajustável e opção de download em `.mp3`.
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleGenerateMedia("audiobook")}
                    disabled={isGeneratingMedia || !hasAnalysis}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingMedia ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Headphones className="w-4 h-4" />
                        <span>
                          {mediaData ? "Acessar Audiobook" : "Gerar Audiobook"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Card 3: Vídeo Explicativo */}
              <div
                className={`rounded-3xl bg-white dark:bg-slate-900 border p-5 flex flex-col justify-between shadow-sm transition ${
                  mediaData
                    ? "border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-400/30"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                      <Video className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{mediaData ? "Vídeo Pronto" : "Slides + Voz"}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Vídeo Explicativo
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                      Vídeo-aula animada com slides dinâmicos, miniatura da página e legendas.
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleGenerateMedia("video")}
                    disabled={isGeneratingMedia || !hasAnalysis}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingMedia ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4" />
                        <span>
                          {mediaData ? "Assistir Vídeo" : "Gerar Vídeo-Aula"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Card 4: Quiz Interativo */}
              <div
                className={`rounded-3xl bg-white dark:bg-slate-900 border p-5 flex flex-col justify-between shadow-sm transition ${
                  quizData
                    ? "border-indigo-400 dark:border-indigo-700 ring-1 ring-indigo-400/30"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                      <CheckSquare className="w-5 h-5" />
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        quizData
                          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                      }`}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{quizData ? "Questionário Pronto" : "Disponível com IA"}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Quiz interativo
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                      Questões de múltipla escolha geradas pela IA com gabarito seguro e justificativa didática.
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
                  {quizData ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("quiz")}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-98 cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Abrir questionário ({quizData.totalQuestions} questões)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateQuiz}
                      disabled={isGeneratingQuiz || !hasAnalysis}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingQuiz ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gerando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Gerar questionário</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 5. Barra de Ações Inferior */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-indigo-950/5 dark:shadow-black/40">
        <button
          type="button"
          onClick={onBackToPages}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition cursor-pointer active:scale-98"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar às páginas</span>
        </button>

        <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-1">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Páginas lidas com sucesso pelo modelo de IA</span>
          </span>
        </div>
      </div>
    </div>
  );
}
