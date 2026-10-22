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
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { StudyPage } from "@/types/study";
import { formatFileSize } from "@/lib/utils";

interface StudyWorkspacePreviewProps {
  pages: StudyPage[];
  studyTitle: string;
  onBackToPages: () => void;
}

interface WorkspaceCardItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  description: string;
  features: string[];
}

const WORKSPACE_CARDS: WorkspaceCardItem[] = [
  {
    id: "summary",
    title: "Texto e resumo",
    icon: FileText,
    description:
      "Extração inteligente do texto com resumo estruturado, pontos-chave e conceitos essenciais do material.",
    features: ["Resumo executivo", "Conceitos fundamentais", "Glossário de termos"],
  },
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
  onBackToPages,
}: StudyWorkspacePreviewProps) {
  const [showPagesList, setShowPagesList] = useState(false);

  const pagesCount = pages.length;
  const displayTitle = studyTitle.trim() || "Material de Estudo Personalizado";

  return (
    <div className="w-full max-w-[860px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 1. Cabeçalho do Ambiente Preparado */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xl shadow-indigo-950/5 dark:shadow-black/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ambiente de Estudo Preparado</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {displayTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              Material organizado com {pagesCount}{" "}
              {pagesCount === 1 ? "página pronta" : "páginas prontas"} para transformação com IA.
            </p>
          </div>

          {/* Botão de Retorno às páginas */}
          <button
            type="button"
            onClick={onBackToPages}
            className="self-start sm:self-center inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 transition cursor-pointer active:scale-98"
            title="Voltar e revisar a ordem ou rotação das páginas"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar às páginas</span>
          </button>
        </div>

        {/* Barra de resumo com toggle para inspecionar páginas organizadas */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowPagesList((prev) => !prev)}
            className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 transition py-1 text-left cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Ver as {pagesCount} páginas organizadas neste estudo</span>
            </span>
            {showPagesList ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Lista expansível de miniaturas organizadas */}
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

      {/* 2. Grid dos 5 Cartões do Ambiente de Estudo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKSPACE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between shadow-md shadow-indigo-950/5 dark:shadow-black/30 hover:border-indigo-300 dark:hover:border-slate-700 transition"
            >
              <div className="space-y-3">
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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

                {/* Sub-itens previstos */}
                <ul className="space-y-1 pt-1">
                  {card.features.map((feat, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
                    >
                      <span className="w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Rodapé do Card com indicação de páginas e botão bloqueado */}
              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {pagesCount} {pagesCount === 1 ? "página incluída" : "páginas incluídas"}
                </span>

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

        {/* Card Informativo com Resumo do Projeto */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border border-indigo-200/70 dark:border-indigo-900/40 p-5 flex flex-col justify-between shadow-md">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Próxima Fase: Integração com IA
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              A estrutura do seu material está pronta. O próximo passo ativará a leitura OCR das páginas e a sintetização didática pelo Google Gemini Flash.
            </p>
          </div>

          <div className="pt-3 text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Processamento 100% seguro e sob demanda</span>
          </div>
        </div>
      </div>

      {/* 3. Barra de Ações Inferior */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-indigo-950/5 dark:shadow-black/40">
        <button
          type="button"
          onClick={onBackToPages}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition cursor-pointer active:scale-98"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar às páginas</span>
        </button>

        {/* Botão Visual: Começar processamento com IA (desabilitado nesta etapa) */}
        <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-1">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="A integração com IA será implementada na próxima etapa do projeto"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-600/60 to-purple-600/60 text-white/90 border border-indigo-400/30 cursor-not-allowed shadow-none"
          >
            <Sparkles className="w-4 h-4 opacity-75" />
            <span>Começar processamento com IA</span>
            <Lock className="w-3.5 h-3.5 opacity-75" />
          </button>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Disponível na próxima etapa com Gemini Flash
          </span>
        </div>
      </div>
    </div>
  );
}
