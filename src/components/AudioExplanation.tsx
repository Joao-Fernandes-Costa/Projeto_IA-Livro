"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Sliders,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Headphones,
  Sparkles,
  BookOpen,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface AudioExplanationProps {
  script: string;
  durationEstimate?: number;
  studyTitle?: string;
  onRegenerateAudio?: () => void;
  onBackToStudy?: () => void;
}

export function AudioExplanation({
  script,
  durationEstimate = 180,
  studyTitle,
  onRegenerateAudio,
  onBackToStudy,
}: AudioExplanationProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showScriptText, setShowScriptText] = useState(false);
  const [copied, setCopied] = useState(false);

  // Divide o texto em sentenças para contornar limitações de duração do SpeechSynthesis no Chrome
  const sentencesRef = useRef<string[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (!allVoices || allVoices.length === 0) return;

      const ptVoices = allVoices.filter((v) => v.lang.toLowerCase().startsWith("pt"));
      const otherVoices = allVoices.filter((v) => !v.lang.toLowerCase().startsWith("pt"));
      const ordered = [...ptVoices, ...otherVoices];
      setVoices(ordered);

      // Prioriza voz pt-BR por padrão
      const defaultPt = ptVoices.find((v) => v.lang.toLowerCase().includes("br")) || ptVoices[0] || ordered[0];
      if (defaultPt) {
        setSelectedVoiceURI((prev) => prev || defaultPt.voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Prepara as frases a partir do script
  useEffect(() => {
    if (!script) {
      sentencesRef.current = [];
      return;
    }

    // Divide em sentenças preservando pontuação para fala natural
    const matches = script.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g);
    const cleaned = (matches || [script])
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    sentencesRef.current = cleaned;
  }, [script]);

  // Limpeza completa do SpeechSynthesis ao desmontar o componente
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer de progresso decorrido
  useEffect(() => {
    if (isPlaying && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isPaused]);

  // Função interna para falar uma frase específica da fila
  const speakSentence = useCallback(
    (index: number) => {
      if (!isSupported || typeof window === "undefined") return;

      const sentences = sentencesRef.current;
      if (index >= sentences.length) {
        // Fim da reprodução completa
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(0);
        isSpeakingRef.current = false;
        return;
      }

      window.speechSynthesis.cancel();

      const sentenceText = sentences[index];
      const utter = new SpeechSynthesisUtterance(sentenceText);
      utteranceRef.current = utter;

      // Configura voz e idioma
      utter.lang = "pt-BR";
      if (selectedVoiceURI) {
        const found = voices.find((v) => v.voiceURI === selectedVoiceURI);
        if (found) utter.voice = found;
      }

      utter.rate = rate;

      utter.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
        isSpeakingRef.current = true;
        setCurrentSentenceIndex(index);
      };

      utter.onend = () => {
        if (isSpeakingRef.current) {
          speakSentence(index + 1);
        }
      };

      utter.onerror = (e) => {
        // Ignora erros causados por cancelamento intencional
        if (e.error === "canceled" || e.error === "interrupted") return;
        console.warn("[SpeechSynthesis] Aviso na reprodução:", e.error);
        if (isSpeakingRef.current) {
          speakSentence(index + 1);
        }
      };

      window.speechSynthesis.speak(utter);
    },
    [isSupported, rate, selectedVoiceURI, voices]
  );

  // Play / Ouvir explicação
  const handlePlay = () => {
    if (!isSupported) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      isSpeakingRef.current = true;
      return;
    }

    const startIndex = currentSentenceIndex >= sentencesRef.current.length ? 0 : currentSentenceIndex;
    if (startIndex === 0) {
      setElapsedSeconds(0);
    }
    speakSentence(startIndex);
  };

  // Pausar
  const handlePause = () => {
    if (!isSupported || !isPlaying) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  // Continuar
  const handleResume = () => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  // Parar
  const handleStop = () => {
    if (!isSupported) return;
    isSpeakingRef.current = false;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
    setElapsedSeconds(0);
  };

  // Mudança de velocidade
  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying) {
      // Reinicia a fala na sentença atual com a nova velocidade
      speakSentence(currentSentenceIndex);
    }
  };

  // Copiar roteiro
  const handleCopyScript = () => {
    if (script) {
      navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalDuration = Math.max(durationEstimate, 60);
  const currentDuration = Math.min(elapsedSeconds, totalDuration);
  const progressPercent = Math.min(100, Math.round((currentDuration / totalDuration) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Card Principal do Player de Áudio */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-colors ${
                isPlaying && !isPaused
                  ? "bg-indigo-600 text-white shadow-indigo-600/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <Headphones className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="w-3 h-3" />
                  <span>Áudio Didático com IA</span>
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Duração estimada: ~{Math.ceil(totalDuration / 60)} min</span>
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Ouça uma explicação do seu material
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {studyTitle ? `Conteúdo baseado em: ${studyTitle}` : "Roteiro falado baseado nas páginas do livro."}
              </p>
            </div>
          </div>

          {/* Indicador visual de status e animação de ondas */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
            {isPlaying && !isPaused && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-end gap-0.5 h-4">
                  <span className="w-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                  <span className="w-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s] h-4" />
                  <span className="w-1 bg-indigo-600 rounded-full animate-bounce h-2" />
                  <span className="w-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.2s] h-3.5" />
                </div>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 ml-1">
                  Reproduzindo
                </span>
              </div>
            )}

            {isPaused && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Pause className="w-3.5 h-3.5" />
                <span>Pausado</span>
              </span>
            )}
          </div>
        </div>

        {/* Alerta se o navegador não suportar SpeechSynthesis */}
        {!isSupported && (
          <div className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold">Navegador sem suporte nativo à síntese de voz:</strong>
              <p className="leading-relaxed">
                Seu navegador atual não disponibiliza a API de síntese de voz (SpeechSynthesis). Você pode ler o
                roteiro didático completo abaixo ou utilizar um navegador moderno como Chrome, Edge ou Safari.
              </p>
            </div>
          </div>
        )}

        {/* Barra de Progresso do Áudio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>{formatTime(currentDuration)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Controles Principais de Áudio */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Botões de Ação (Play, Pause, Resume, Stop) */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-start">
            {!isPlaying || isPaused ? (
              <button
                type="button"
                onClick={handlePlay}
                disabled={!isSupported}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Ouvir explicação em áudio"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isPaused ? "Continuar" : "Ouvir explicação"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 transition active:scale-98 cursor-pointer"
                title="Pausar áudio"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pausar</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              disabled={!isPlaying && !isPaused && elapsedSeconds === 0}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Parar e reiniciar reprodução"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Parar</span>
            </button>
          </div>

          {/* Controle de Velocidade */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>Velocidade:</span>
            </span>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleRateChange(v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    rate === v
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {v}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Seleção de Voz em Português */}
        {isSupported && voices.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Volume2 className="w-4 h-4 text-indigo-500" />
              <label htmlFor="voice-select" className="font-medium">
                Voz da narração:
              </label>
            </div>

            <select
              id="voice-select"
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-sm"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Roteiro Textual Completo (Expansível) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowScriptText((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer text-left"
          >
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>Texto do roteiro didático</span>
            {showScriptText ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>

          <button
            type="button"
            onClick={handleCopyScript}
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
                <span>Copiar roteiro</span>
              </>
            )}
          </button>
        </div>

        {showScriptText && (
          <div className="rounded-2xl p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-3 animate-fadeIn">
            {script.split("\n\n").map((par, i) => (
              <p key={i}>{par}</p>
            ))}
          </div>
        )}
      </div>

      {/* 3. Ações de Rodapé */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {onBackToStudy && (
          <button
            type="button"
            onClick={onBackToStudy}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition active:scale-98 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Voltar ao texto do estudo</span>
          </button>
        )}

        {onRegenerateAudio && (
          <button
            type="button"
            onClick={onRegenerateAudio}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Gerar novo roteiro de áudio</span>
          </button>
        )}
      </div>
    </div>
  );
}
