import React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Bot, Shield, Sparkles } from "lucide-react";
import { AISettingsPanel } from "@/components/ai";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HomeFooter } from "@/components/HomeFooter";

export const metadata = {
  title: "Configurações de IA — EstudaIA",
  description: "Gerencie provedores de inteligência artificial (Ollama, OpenRouter, OpenAI, Gemini e Customizados) no EstudaIA.",
};

export default function AISettingsPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#f8faff] via-white to-[#f1f5fd] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-200">
      {/* 1. Header de Configurações */}
      <header className="w-full border-b border-slate-200/90 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-15 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Voltar para a página inicial"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Início</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Configurações de IA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/configuracoes/ia"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition"
              title="Painel Administrativo de Chaves"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Admin</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 2. Conteúdo Principal */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Cabeçalho da Seção */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Arquitetura de Modelos Multimodais</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Provedores e Modelos de Inteligência Artificial
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed font-normal">
            Escolha manualmente o provedor que será utilizado para ler as páginas dos livros e gerar os resumos, aulas e quizzes. Todas as credenciais permanecem salvas estritamente no servidor.
          </p>
        </div>

        {/* Painel Central de Configurações */}
        <AISettingsPanel />
      </main>

      {/* 3. Rodapé */}
      <HomeFooter />
    </div>
  );
}
