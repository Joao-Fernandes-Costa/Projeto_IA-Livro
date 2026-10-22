"use client";

import React, { useState, useEffect } from "react";
import {
  Headphones,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Save,
  Key,
  Globe,
  Sliders,
  Radio,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { TTSConfiguration, TTSProviderName } from "@/lib/tts/tts-provider";

interface AudioSettingsSectionProps {
  initialConfig?: TTSConfiguration;
  onSaved?: () => void;
}

const TTS_PROVIDERS: Array<{
  id: TTSProviderName;
  name: string;
  badge: string;
  description: string;
}> = [
  {
    id: "browser",
    name: "Navegador (Web Speech API)",
    badge: "Padrão & Sem Custos",
    description: "Sintetiza a voz diretamente no dispositivo do usuário, sem necessidade de servidores ou chaves.",
  },
  {
    id: "openai",
    name: "OpenAI TTS",
    badge: "Alta Fidelidade",
    description: "Vozes neurais ultra-realistas (Nova, Alloy, Echo, Onyx). Requer chave própria de áudio.",
  },
  {
    id: "custom",
    name: "Endpoint Compatível",
    badge: "Flexível",
    description: "Servidor TTS personalizado compatível com a API OpenAI (ex: LocalAI, TTS proxy).",
  },
  {
    id: "local",
    name: "Local / Futuro (Piper)",
    badge: "Privado",
    description: "Execução totalmente local e offline utilizando Piper TTS ou modelos neurais locais.",
  },
];

const OPENAI_VOICES = [
  { id: "nova", label: "Nova — Feminina natural e enérgica" },
  { id: "alloy", label: "Alloy — Voz equilibrada e neutra" },
  { id: "echo", label: "Echo — Masculina clara e direta" },
  { id: "fable", label: "Fable — Expressiva e narrativa" },
  { id: "onyx", label: "Onyx — Masculina encorpada e grave" },
  { id: "shimmer", label: "Shimmer — Feminina suave" },
];

export function AudioSettingsSection({ initialConfig, onSaved }: AudioSettingsSectionProps) {
  const [provider, setProvider] = useState<TTSProviderName>(initialConfig?.provider || "browser");
  const [voice, setVoice] = useState(initialConfig?.voice || "default-pt-br");
  const [speed, setSpeed] = useState<number>(initialConfig?.speed || 1.0);
  const [format, setFormat] = useState(initialConfig?.format || "mp3");
  const [baseUrl, setBaseUrl] = useState(initialConfig?.baseUrl || "");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(Boolean(initialConfig?.apiKeyConfigured));

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setProvider(initialConfig.provider);
      setVoice(initialConfig.voice);
      setSpeed(initialConfig.speed);
      setFormat(initialConfig.format);
      setBaseUrl(initialConfig.baseUrl || "");
      setApiKeyConfigured(initialConfig.apiKeyConfigured);
    }
  }, [initialConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tts: {
            provider,
            voice,
            speed,
            format,
            baseUrl: baseUrl.trim() || undefined,
            apiKey: apiKey.trim() || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar configurações de áudio.");
      }

      if (data.data?.tts) {
        setApiKeyConfigured(data.data.tts.apiKeyConfigured);
      }
      setApiKey("");
      setMessage({ type: "success", text: "Configurações de áudio e voz salvas com sucesso!" });
      setTimeout(() => setMessage(null), 4000);
      onSaved?.();
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Falha ao salvar configurações de áudio.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Áudio e Voz (TTS)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {provider.toUpperCase()}
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Configure o sintetizador de voz responsável por narrar os resumos didáticos dos livros.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-2xl p-3.5 text-xs flex items-center gap-2.5 transition animate-fadeIn ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Escolha do Provedor de Áudio */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Provedor de Síntese de Voz (TTS)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TTS_PROVIDERS.map((p) => {
              const isSelected = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`text-left p-3.5 rounded-2xl border transition cursor-pointer select-none ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {p.name}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Voz e Velocidade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Voz Preferencial</span>
            </label>

            {provider === "openai" ? (
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {OPENAI_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                placeholder="Ex: default-pt-br ou pt-BR"
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {provider === "browser"
                ? "O navegador priorizará vozes em português brasileiro instaladas no seu sistema."
                : "Identificador da voz do sintetizador."}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span>Velocidade Padrão</span>
              </span>
              <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                {speed}x
              </strong>
            </label>

            <div className="flex items-center gap-1.5">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setSpeed(rate)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                    speed === rate
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Velocidade inicial ao iniciar a reprodução.
            </span>
          </div>
        </div>

        {/* 3. Formato e Endpoint Custom (se aplicável) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-indigo-500" />
              <span>Formato de Áudio</span>
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="mp3">MP3 (Universal, leve e compatível)</option>
              <option value="opus">Opus (Alta compressão para streaming)</option>
              <option value="aac">AAC (Áudio avançado)</option>
              <option value="wav">WAV (Sem perdas)</option>
            </select>
          </div>

          {(provider === "custom" || provider === "local" || provider === "openai") && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>Endpoint Personalizado (URL Base)</span>
              </label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={
                  provider === "openai"
                    ? "https://api.openai.com/v1"
                    : "http://localhost:8000/v1"
                }
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Opcional. Deixe em branco para usar o endpoint padrão.
              </span>
            </div>
          )}
        </div>

        {/* 4. Chave de API Específica para Áudio */}
        {(provider === "openai" || provider === "custom") && (
          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-500" />
                <span>Chave de API Específica de Áudio</span>
              </label>
              {apiKeyConfigured && (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Chave configurada no servidor
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiKeyConfigured ? "•••••••••••••••••••••••• (deixe em branco para manter)" : "sk-..."}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 pr-10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((prev) => !prev)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              ⚠️ <strong>Segurança:</strong> A chave de áudio é mantida isolada no servidor e <strong>NUNCA reutiliza automaticamente a chave dos modelos de visão/leitura</strong> sem sua definição explícita.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar configurações de áudio</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
