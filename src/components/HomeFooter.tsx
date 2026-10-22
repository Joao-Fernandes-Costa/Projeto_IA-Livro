"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

export function HomeFooter() {
  return (
    <footer className="w-full max-w-xl mx-auto py-6 px-4 text-center space-y-2 mt-auto">
      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
        Você envia o conteúdo. O EstudeAI ajuda a entender.
      </p>
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span>
          Suas páginas são processadas de forma segura exclusivamente para gerar
          seus materiais educacionais personalizados.
        </span>
      </div>
    </footer>
  );
}
