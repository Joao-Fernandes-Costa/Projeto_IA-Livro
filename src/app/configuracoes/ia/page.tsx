import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bot, Shield, Sparkles } from "lucide-react";
import { AISettingsPanel } from "@/components/ai";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HomeFooter } from "@/components/HomeFooter";
import { requireAdminSession } from "@/lib/security/admin-auth";

export const metadata = {
  title: "Configurações de IA — EstudeAI",
  description: "Gerencie provedores de inteligência artificial (OpenRouter, Ollama, OpenAI, Gemini e Customizados) no EstudeAI.",
};

export default async function AISettingsPage() {
  // Verificação estrita de sessão administrativa no servidor
  const isAdmin = await requireAdminSession();
  if (!isAdmin) {
    redirect("/");
  }

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
                Painel Administrativo de IA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Sessão Admin Ativa</span>
            </span>
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
            <span>Configurações Restritas do Administrador</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Provedores e Modelos de Inteligência Artificial
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed font-normal">
            Painel exclusivo para administradores. Configure o provedor ativo, modelos multimodais e chaves de API. Todas as configurações e credenciais permanecem salvas e criptografadas estritamente no servidor.
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
