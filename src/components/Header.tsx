"use client";

import React from "react";
import { BookOpen } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-white">
                EstudeAI
              </h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Protótipo • Etapa 1
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Envio e organização das páginas do livro
            </p>
          </div>
        </div>

        {/* Indicador das etapas futuras do projeto */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium shadow-sm">
            1. Fotos das Páginas
          </span>
          <span className="text-slate-600">→</span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-500 border border-slate-800">
            2. Leitura IA & Aula (Áudio/Vídeo)
          </span>
          <span className="text-slate-600">→</span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-500 border border-slate-800">
            3. Quiz de Fixação
          </span>
        </div>
      </div>
    </header>
  );
}
