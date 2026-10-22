"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Headphones,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Volume2,
  Loader2,
  BookOpen,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import type { AudiobookChapter, StudyMediaPackage } from "@/lib/lecture/schema";

interface AudiobookPlayerProps {
  media: StudyMediaPackage;
  onBackToStudy: () => void;
  onRegenerateMedia?: () => void;
}

export function AudiobookPlayer({
  media,
  onBackToStudy,
  onRegenerateMedia,
}: AudiobookPlayerProps) {
  const chapters = media.audiobookChapters;
  const [activeIndex, setActiveIndex] = useState(0);
  const [voice, setVoice] = useState<"female" | "male">("female");
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [usingBrowserFallback, setUsingBrowserFallback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Cache de buffers base64 por chave `${chapterId}-${voice}`
  const audioCacheRef = useRef<Record<string, string>>({});

  const currentChapter: AudiobookChapter =
    chapters[activeIndex] || chapters[0];

  const stopBrowserSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Busca ou retorna do cache o MP3 em base64 para um capítulo
  const fetchChapterAudioBase64 = useCallback(
    async (chapter: AudiobookChapter, selectedVoice: "female" | "male") => {
      const cacheKey = `${chapter.id}-${selectedVoice}`;
      if (audioCacheRef.current[cacheKey]) {
        return audioCacheRef.current[cacheKey];
      }

      const fullSpeechText = `${chapter.title}. ${chapter.narrationText}`;
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullSpeechText,
          voice: selectedVoice,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.audioBase64) {
        throw new Error(data.error || "Falha ao sintetizar voz no servidor.");
      }

      audioCacheRef.current[cacheKey] = data.audioBase64;
      return data.audioBase64 as string;
    },
    []
  );

  // Reproduz um capítulo específico
  const playChapter = useCallback(
    async (index: number, autoStart = true) => {
      const target = chapters[index];
      if (!target) return;

      stopBrowserSpeech();
      if (audioRef.current) {
        audioRef.current.pause();
      }

      setActiveIndex(index);
      setCurrentTime(0);
      setDuration(0);

      if (!autoStart) {
        setIsPlaying(false);
        return;
      }

      setIsLoadingAudio(true);
      setUsingBrowserFallback(false);

      try {
        const base64 = await fetchChapterAudioBase64(target, voice);
        const audioSrc = `data:audio/mpeg;base64,${base64}`;

        if (!audioRef.current) {
          audioRef.current = new Audio();
        }

        const audio = audioRef.current;
        audio.src = audioSrc;
        audio.playbackRate = playbackRate;

        audio.onloadedmetadata = () => {
          setDuration(audio.duration || 0);
        };

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime || 0);
        };

        audio.onended = () => {
          if (index + 1 < chapters.length) {
            playChapter(index + 1, true);
          } else {
            setIsPlaying(false);
          }
        };

        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn("Usando Web Speech API de fallback:", err);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          setUsingBrowserFallback(true);
          const utter = new SpeechSynthesisUtterance(
            `${target.title}. ${target.narrationText}`
          );
          utter.lang = "pt-BR";
          utter.rate = playbackRate;
          utter.onend = () => {
            if (index + 1 < chapters.length) {
              playChapter(index + 1, true);
            } else {
              setIsPlaying(false);
            }
          };
          window.speechSynthesis.speak(utter);
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
        }
      } finally {
        setIsLoadingAudio(false);
      }
    },
    [chapters, fetchChapterAudioBase64, playbackRate, stopBrowserSpeech, voice]
  );

  // Alternar Play / Pause
  const togglePlayPause = async () => {
    if (isLoadingAudio) return;

    if (usingBrowserFallback && typeof window !== "undefined") {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      } else {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setIsPlaying(true);
        } else {
          await playChapter(activeIndex, true);
        }
      }
      return;
    }

    if (audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      await playChapter(activeIndex, true);
    }
  };

  // Atualizar velocidade em tempo real
  const handleSpeedChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  // Trocar voz (Feminina / Masculina)
  const handleVoiceChange = (newVoice: "female" | "male") => {
    if (newVoice === voice) return;
    setVoice(newVoice);
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Baixar o capítulo atual em MP3
  const handleDownloadCurrentChapter = async () => {
    try {
      setIsLoadingAudio(true);
      const base64 = await fetchChapterAudioBase64(currentChapter, voice);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: "audio/mpeg",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audiobook-capitulo-${currentChapter.chapterNumber}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Não foi possível baixar o áudio deste capítulo."
      );
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Baixar o Audiobook Completo (concatena os MP3 de todos os capítulos)
  const handleDownloadFullAudiobook = async () => {
    try {
      setIsDownloadingAll(true);
      const blobs: BlobPart[] = [];

      for (const chap of chapters) {
        const base64 = await fetchChapterAudioBase64(chap, voice);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        blobs.push(bytes.buffer);
      }

      const fullBlob = new Blob(blobs, { type: "audio/mpeg" });
      const url = URL.createObjectURL(fullBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${media.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-audiobook-completo.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Erro ao gerar o download completo do audiobook."
      );
    } finally {
      setIsDownloadingAll(false);
    }
  };

  useEffect(() => {
    return () => {
      stopBrowserSpeech();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [stopBrowserSpeech]);

  const formatTime = (sec: number) => {
    if (!sec || !Number.isFinite(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Card Principal do Player de Audiobook */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Audiobook Neural • Capítulo {currentChapter.chapterNumber} de{" "}
                  {chapters.length}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Pág. {currentChapter.sourcePages.join(", ")}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                {currentChapter.title}
              </h3>
            </div>
          </div>

          {/* Seletor de Voz Neural */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-900/90 border border-slate-700 p-1 text-xs">
              <button
                type="button"
                onClick={() => handleVoiceChange("female")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  voice === "female"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🎙️ Francisca (F)
              </button>
              <button
                type="button"
                onClick={() => handleVoiceChange("male")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  voice === "male"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🎙️ Antônio (M)
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadFullAudiobook}
              disabled={isDownloadingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-60"
              title="Baixar todos os capítulos em um único arquivo MP3"
            >
              {isDownloadingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Unindo MP3...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Audiobook (.mp3)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Caixa de Transcrição Acompanhada */}
        <div className="rounded-2xl bg-slate-950/70 border border-slate-800/90 p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-indigo-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              Roteiro falado deste capítulo
            </span>
            <button
              type="button"
              onClick={handleDownloadCurrentChapter}
              disabled={isLoadingAudio}
              className="text-slate-400 hover:text-white inline-flex items-center gap-1 transition cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Baixar faixa atual</span>
            </button>
          </div>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
            {currentChapter.narrationText}
          </p>
        </div>

        {/* Barra de Progresso do Áudio */}
        <div className="space-y-2">
          <div
            onClick={(e) => {
              if (!audioRef.current || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width)
              );
              audioRef.current.currentTime = ratio * duration;
              setCurrentTime(ratio * duration);
            }}
            className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer border border-slate-700"
          >
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>
              {usingBrowserFallback
                ? "Voz local do navegador ativa"
                : duration > 0
                ? formatTime(duration)
                : "Clique em Play para ouvir"}
            </span>
          </div>
        </div>

        {/* Controles Principais de Reprodução */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Velocidade */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Velocidade:</span>
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleSpeedChange(rate)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  playbackRate === rate
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Botões Voltar / Play / Avançar */}
          <div className="flex items-center gap-3 mx-auto sm:mx-0">
            <button
              type="button"
              onClick={() => playChapter(activeIndex - 1, true)}
              disabled={activeIndex === 0 || isLoadingAudio}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 transition cursor-pointer"
              title="Capítulo anterior"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              disabled={isLoadingAudio}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-60"
            >
              {isLoadingAudio ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gerando voz...</span>
                </>
              ) : isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Ouvir Capítulo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => playChapter(activeIndex + 1, true)}
              disabled={activeIndex === chapters.length - 1 || isLoadingAudio}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 transition cursor-pointer"
              title="Próximo capítulo"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Capítulos do Audiobook */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Faixas do Audiobook ({chapters.length} capítulos)</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clique em qualquer capítulo para reproduzir imediatamente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onRegenerateMedia && (
              <button
                type="button"
                onClick={onRegenerateMedia}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regerar roteiro</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBackToStudy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
            >
              <span>Ver Resumo Escrito</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {chapters.map((chap, idx) => {
            const isCurrent = idx === activeIndex;
            return (
              <div
                key={chap.id}
                onClick={() => playChapter(idx, true)}
                className={`rounded-2xl p-4 border transition cursor-pointer flex items-start justify-between gap-4 ${
                  isCurrent
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/30"
                    : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                      isCurrent
                        ? "bg-indigo-600 text-white shadow"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <Volume2 className="w-4 h-4 animate-pulse" />
                    ) : (
                      <span>#{chap.chapterNumber}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                        {chap.title}
                      </h5>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                        <BookOpen className="w-3 h-3" />
                        Pág. {chap.sourcePages.join(", ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {chap.keySummary}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 ${
                    isCurrent
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {isCurrent && isPlaying ? "Tocando..." : "Ouvir"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
