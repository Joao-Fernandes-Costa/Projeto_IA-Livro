"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, BookMarked, HelpCircle, Sparkles, Settings } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface HomeHeaderProps {
  onOpenMyStudies?: () => void;
  onOpenHelp?: () => void;
}

export function HomeHeader({ onOpenMyStudies, onOpenHelp }: HomeHeaderProps) {
  return (
    <header className="w-full border-b border-slate-200/90 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-15 sm:h-16 flex items-center justify-between">
        {/* Logo e Nome */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                EstudeAI
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                <Sparkles className="w-2.5 h-2.5" />
                Beta
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 hidden sm:block font-normal">
              Seu companheiro inteligente de estudos
            </p>
          </div>
        </div>

        {/* Ações da Direita com espaçamento adaptável para telas a partir de 320px */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onOpenMyStudies}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Ver histórico de estudos"
          >
            <BookMarked className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="hidden min-[420px]:inline">Meus estudos</span>
          </button>

          {/* Botão de Alternância de Tema Claro / Escuro */}
          <ThemeToggle />

          {/* Link para Configurações de IA */}
          <Link
            href="/configuracoes/ia"
            className="p-1.5 sm:p-2 rounded-xl text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition cursor-pointer"
            aria-label="Configurações de IA"
            title="Configurar Provedores e Modelos de IA"
          >
            <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </Link>

          <button
            type="button"
            onClick={onOpenHelp}
            className="p-1.5 sm:p-2 rounded-xl text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition cursor-pointer"
            aria-label="Ajuda e orientações"
            title="Como funciona o EstudeAI"
          >
            <HelpCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
