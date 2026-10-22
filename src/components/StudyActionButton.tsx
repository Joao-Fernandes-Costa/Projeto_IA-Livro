"use client";

import React from "react";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";

interface StudyActionButtonProps {
  hasPages: boolean;
  isProcessing: boolean;
  isSubmitted?: boolean;
  createdStudyId?: string | null;
  onStartStudy: () => void;
}

export function StudyActionButton({
  hasPages,
  isProcessing,
  onStartStudy,
}: StudyActionButtonProps) {
  const isEnabled = hasPages && !isProcessing;

  return (
    <button
      type="button"
      onClick={isEnabled ? onStartStudy : undefined}
      disabled={!isEnabled}
      title={
        hasPages
          ? "Começar estudo com as páginas organizadas"
          : "Adicione ao menos uma página para começar o estudo"
      }
      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
        isEnabled
          ? "bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-600/25 hover:shadow-md cursor-pointer active:scale-98"
          : "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 cursor-not-allowed shadow-none"
      }`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span>Preparando estudo...</span>
        </>
      ) : hasPages ? (
        <>
          <Sparkles className="w-4 h-4" />
          <span>Começar estudo</span>
        </>
      ) : (
        <>
          <ArrowRight className="w-4 h-4" />
          <span>Começar estudo</span>
        </>
      )}
    </button>
  );
}
