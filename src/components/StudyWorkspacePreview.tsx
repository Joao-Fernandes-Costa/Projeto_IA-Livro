"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  FileText,
  GraduationCap,
  Presentation,
  Headphones,
  CheckSquare,
  Lock,
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
} from "lucide-react";
import type { StudyPage } from "@/types/study";
import type { StudyAnalysis } from "@/lib/ai/schema";
import { formatFileSize } from "@/lib/utils";

interface StudyWorkspacePreviewProps {
  pages: StudyPage[];
  studyTitle: string;
  analysis?: StudyAnalysis | null;
  onBackToPages: () => void;
}

interface WorkspaceCardItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  description: string;
  features: string[];
}

const FUTURE_WORKSPACE_CARDS: WorkspaceCardItem[] = [
  {
    id: "lecture",
    title: "Aula explicativa",
    icon: GraduationCap,
    description:
      "Roteiro didático dividido em tópicos explicados passo a passo de forma simples e contextualizada.",
    features: ["Explicação didática", "Analogias práticas", "Roteiro sequencial"],
  },
  {
    id: "slides",
    title: "Slides didáticos",
    icon: Presentation,
    description:
      "Apresentação visual com tópicos diretos, esquemas de ideias e cartões para memorização rápida.",
    features: ["Tópicos visuais", "Esquemas conceituais", "Modo apresentação"],
  },
  {
    id: "audio",
    title: "Áudio explicativo",
    icon: Headphones,
    description:
      "Explicação guiada em áudio para ouvir no seu ritmo enquanto revisa ou realiza outras atividades.",
    features: ["Narração natural", "Controle de velocidade", "Capítulos de áudio"],
  },
  {
    id: "quiz",
    title: "Quiz interativo",
    icon: CheckSquare,
    description:
      "Questões de múltipla escolha com gabarito e justificativa para fixação e validação do aprendizado.",
    features: ["Perguntas contextualizadas", "Gabarito comentado", "Feedback imediato"],
  },
];

export function StudyWorkspacePreview({
  pages,
  studyTitle,
  analysis,
  onBackToPages,
}: StudyWorkspacePreviewProps) {
  const [showPagesList, setShowPagesList] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [copied, setCopied] = useState(false);

  const pagesCount = pages.length;
  const displayTitle = studyTitle.trim() || "Material de Estudo Personalizado";

  const totalPages = pagesCount;
  const processedPages = analysis?.processedPages ?? (analysis?.pageAnalyses?.length || 0);
  const failedPages = analysis?.failedPages ?? (totalPages - processedPages);
  const hasAnalysis = Boolean(analysis && analysis.pageAnalyses && analysis.pageAnalyses.length > 0);
  const confidencePercent = analysis ? Math.round(analysis.averageConfidence * 100) : 95;

  // Status visual:
  // - Se todas as páginas forem processadas: "Leitura concluída"
  // - Se algumas falharem: "Leitura concluída com falhas"
  // - Se todas falharem: "Falha na leitura"
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
                <span className={`w-2 h-2 rounded-full ${readingStatus.dotClass} animate-pulse`} />
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

          <button
            type="button"
            onClick={onBackToPages}
            className="self-start sm:self-center inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition cursor-pointer active:scale-98"
            title="Voltar e revisar as páginas originais"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar às páginas</span>
          </button>
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
            {showPagesList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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

      {/* 2. Cartão Ativo: Texto e Resumo Processado com IA */}
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
                Extração integral do texto do livro físico e síntese conceitual estruturada.
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
              <span>{showFullText ? "Recolher transcrição" : "Ver texto completo"}</span>
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
                        {pageAnalysis.title ? ` — ${pageAnalysis.title}` : ""}
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

      {/* 3. Grid dos 4 Recursos Futuros (Bloqueados) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Próximos Módulos Educacionais
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FUTURE_WORKSPACE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm opacity-85 hover:opacity-100 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                      <span>Disponível na próxima etapa</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                      {card.description}
                    </p>
                  </div>

                  <ul className="space-y-1 pt-1">
                    {card.features.map((feat, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
                      >
                        <span className="w-1 h-1 rounded-full bg-slate-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-800 cursor-not-allowed select-none"
                  >
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    <span>Em breve com IA</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Barra de Ações Inferior */}
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
