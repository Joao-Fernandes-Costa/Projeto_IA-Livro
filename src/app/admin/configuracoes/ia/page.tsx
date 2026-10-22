"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogOut,
  ArrowLeft,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Bot,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { AdminAISettingsPanel } from "@/components/admin/AdminAISettingsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HomeFooter } from "@/components/HomeFooter";

interface AdminSessionState {
  loading: boolean;
  authenticated: boolean;
  adminConfigured: boolean;
  encryptionConfigured: boolean;
}

export default function AdminAISettingsPage() {
  const [session, setSession] = useState<AdminSessionState>({
    loading: true,
    authenticated: false,
    adminConfigured: false,
    encryptionConfigured: false,
  });

  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Consulta status da sessão no backend
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session");
      if (res.ok) {
        const data = await res.json();
        setSession({
          loading: false,
          authenticated: Boolean(data.authenticated),
          adminConfigured: Boolean(data.adminConfigured),
          encryptionConfigured: Boolean(data.encryptionConfigured),
        });
      } else {
        setSession((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setSession((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Login administrativo
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setSubmitting(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Senha administrativa incorreta.");
      }

      setPasswordInput("");
      setSession((prev) => ({ ...prev, authenticated: true }));
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Falha na autenticação.");
    } finally {
      setSubmitting(false);
    }
  };

  // Logout administrativo
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setSession((prev) => ({ ...prev, authenticated: false }));
      setPasswordInput("");
      setLoginError(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#f8faff] via-white to-[#f1f5fd] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-200">
      {/* 1. Header Administrativo */}
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
              <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Administração
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {session.authenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Encerrar sessão</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Conteúdo Principal */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-8 sm:py-12 space-y-6">
        {session.loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Verificando permissões administrativas...
            </span>
          </div>
        ) : !session.authenticated ? (
          /* Formulário de Acesso Administrativo */
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Painel Administrativo de IA
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Informe a senha mestre para gerenciar chaves e credenciais seguras do EstudeAI.
              </p>
            </div>

            {/* Alerta se AI_ADMIN_PASSWORD não estiver configurada no servidor */}
            {!session.adminConfigured ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Configuração Administrativa Incompleta</span>
                </div>
                <p className="text-xs leading-relaxed">
                  A variável de ambiente <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">AI_ADMIN_PASSWORD</code> não está configurada no servidor.
                </p>
                <p className="text-xs leading-relaxed">
                  Por motivos de segurança, o acesso administrativo e o salvamento de chaves só são permitidos após definir uma senha no arquivo <code className="font-mono">.env.local</code>.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleLogin}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                {loginError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{loginError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Senha Administrativa
                  </label>

                  <div className="relative">
                    <input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Digite a senha administrativa..."
                      required
                      autoFocus
                      className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !passwordInput.trim()}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  <span>{submitting ? "Autenticando..." : "Acessar Painel"}</span>
                </button>

                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                  Protegido contra força bruta com bloqueio por tentativas e cookies HttpOnly seguros.
                </p>
              </form>
            )}
          </div>
        ) : (
          /* Painel Autenticado */
          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sessão Administrativa Ativa (AES-256-GCM)</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Configuração Segura do OpenRouter
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Cadastre e gerencie a chave de API do OpenRouter para leitura de páginas de livros e processamento multimodal. A chave nunca é exposta no frontend, nos logs ou no Git.
              </p>
            </div>

            {/* Painel do OpenRouter */}
            <AdminAISettingsPanel
              onSessionExpired={() => setSession((prev) => ({ ...prev, authenticated: false }))}
              encryptionConfigured={session.encryptionConfigured}
            />

            {/* Link para o painel de seleção de provedor do usuário */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Quer selecionar o provider ativo para seus estudos?</span>
              </div>

              <Link
                href="/configuracoes/ia"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>Ir para seleção de provedores</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* 3. Rodapé */}
      <HomeFooter />
    </div>
  );
}
