"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Video,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Loader2,
  Maximize2,
  Sparkles,
  BookOpen,
  Volume2,
  CheckCircle2,
} from "lucide-react";
import type { StudyMediaPackage, VideoScene } from "@/lib/lecture/schema";
import type { StudyPage } from "@/types/study";

interface ExplanatoryVideoPlayerProps {
  media: StudyMediaPackage;
  pages: StudyPage[];
  onBackToStudy: () => void;
}

/**
 * Quebra texto longo em múltiplas linhas para caber perfeitamente no Canvas 1280x720
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function ExplanatoryVideoPlayer({
  media,
  pages,
  onBackToStudy,
}: ExplanatoryVideoPlayerProps) {
  const scenes = media.videoScenes;
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [voice, setVoice] = useState<"female" | "male">("female");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingScene, setIsLoadingScene] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0); // 0 to 1
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgressText, setExportProgressText] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Record<string, string>>({});
  const pageImagesCacheRef = useRef<Record<number, HTMLImageElement>>({});
  const animFrameRef = useRef<number | null>(null);

  const currentScene: VideoScene = scenes[activeSceneIndex] || scenes[0];

  // Pré-carrega as imagens das páginas do livro para desenhar no quadro do vídeo
  useEffect(() => {
    pages.forEach((p, idx) => {
      const pageNum = idx + 1;
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = p.previewUrl;
      img.onload = () => {
        pageImagesCacheRef.current[pageNum] = img;
      };
    });
  }, [pages]);

  // Desenha o frame atual da vídeo-aula no Canvas HD (1280x720)
  const renderSceneToCanvas = useCallback(
    (scene: VideoScene, progress: number, playing: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = canvas.width; // 1280
      const H = canvas.height; // 720

      // 1. Fundo Gradiente Moderno Escuro
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, "#090d1f");
      bgGrad.addColorStop(0.55, "#111836");
      bgGrad.addColorStop(1, "#0b1329");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Grade decorativa sutil ao fundo
      ctx.strokeStyle = "rgba(99, 102, 241, 0.07)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // 2. Barra Superior (Header do Vídeo)
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(0, 0, W, 72);

      // Badge da Cena
      ctx.fillStyle = "#4f46e5";
      ctx.beginPath();
      ctx.roundRect(40, 18, 150, 36, 12);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(
        `CENA ${scene.sceneNumber} DE ${scenes.length}`,
        62,
        42
      );

      // Badge da Página de Origem
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
      ctx.beginPath();
      ctx.roundRect(205, 18, 150, 36, 12);
      ctx.fill();

      ctx.fillStyle = "#6ee7b7";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(`PÁGINA #${scene.sourcePage}`, 232, 42);

      // Marca d'água EstudeAI no canto superior direito
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("EstudeAI • Vídeo Explicativo", W - 290, 42);

      // 3. Área Esquerda (Título + Tópicos Animados + Destaque Visual)
      const leftWidth = 780;
      const startX = 48;

      // Subtítulo
      ctx.fillStyle = "#818cf8";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(scene.subtitle.toUpperCase(), startX, 118);

      // Título Principal da Cena
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px sans-serif";
      const titleLines = wrapCanvasText(ctx, scene.title, leftWidth);
      let cursorY = 160;
      titleLines.slice(0, 2).forEach((line) => {
        ctx.fillText(line, startX, cursorY);
        cursorY += 44;
      });

      cursorY += 12;

      // Tópicos (Bullet Points) que aparecem/acendem conforme o progresso da cena
      const bullets = scene.bulletPoints;
      bullets.forEach((bullet, idx) => {
        const threshold = idx / Math.max(1, bullets.length);
        const isActiveBullet = progress >= threshold * 0.75;

        ctx.save();
        ctx.fillStyle = isActiveBullet
          ? "rgba(30, 41, 59, 0.92)"
          : "rgba(15, 23, 42, 0.55)";
        ctx.strokeStyle = isActiveBullet
          ? "rgba(99, 102, 241, 0.65)"
          : "rgba(51, 65, 85, 0.4)";
        ctx.lineWidth = 2;

        const bulletLines = wrapCanvasText(ctx, bullet, leftWidth - 75);
        const boxHeight = Math.max(58, bulletLines.length * 26 + 24);

        ctx.beginPath();
        ctx.roundRect(startX, cursorY, leftWidth, boxHeight, 14);
        ctx.fill();
        ctx.stroke();

        // Círculo numerado do tópico
        ctx.fillStyle = isActiveBullet ? "#4f46e5" : "#334155";
        ctx.beginPath();
        ctx.arc(startX + 28, cursorY + boxHeight / 2, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText(`${idx + 1}`, startX + 23, cursorY + boxHeight / 2 + 5);

        // Texto do tópico
        ctx.fillStyle = isActiveBullet ? "#f8fafc" : "#94a3b8";
        ctx.font = "500 19px sans-serif";
        let textY = cursorY + 30;
        bulletLines.slice(0, 2).forEach((bLine) => {
          ctx.fillText(bLine, startX + 56, textY);
          textY += 25;
        });

        ctx.restore();
        cursorY += boxHeight + 14;
      });

      // 4. Quadro Direita: Destaque Conceitual + Miniatura da Página do Livro
      const rightX = 865;
      const rightW = 370;

      // Miniatura da página original (se carregada)
      const pageImg =
        pageImagesCacheRef.current[scene.sourcePage] ||
        pageImagesCacheRef.current[1];

      if (pageImg) {
        ctx.save();
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(rightX, 100, rightW, 250, 18);
        ctx.fill();
        ctx.stroke();

        // Desenha a foto da página centralizada
        const pad = 12;
        const availW = rightW - pad * 2;
        const availH = 210;
        const scale = Math.min(
          availW / pageImg.width,
          availH / pageImg.height
        );
        const drawW = pageImg.width * scale;
        const drawH = pageImg.height * scale;
        const drawX = rightX + (rightW - drawW) / 2;
        const drawY = 112 + (availH - drawH) / 2;

        ctx.drawImage(pageImg, drawX, drawY, drawW, drawH);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(
          `Foto Original • Página ${scene.sourcePage}`,
          rightX + 20,
          338
        );
        ctx.restore();
      }

      // Cartão de Destaque Visual (Conceito / Fórmula / Resumo)
      const cardY = pageImg ? 368 : 140;
      const cardH = pageImg ? 185 : 320;

      ctx.save();
      const cardGrad = ctx.createLinearGradient(
        rightX,
        cardY,
        rightX + rightW,
        cardY + cardH
      );
      cardGrad.addColorStop(0, "rgba(79, 70, 229, 0.28)");
      cardGrad.addColorStop(1, "rgba(16, 185, 129, 0.18)");
      ctx.fillStyle = cardGrad;
      ctx.strokeStyle = "rgba(129, 140, 248, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(rightX, cardY, rightW, cardH, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#a5b4fc";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(
        `★ ${scene.visualHighlight.label.toUpperCase()}`,
        rightX + 22,
        cardY + 34
      );

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      const highlightLines = wrapCanvasText(
        ctx,
        scene.visualHighlight.content,
        rightW - 44
      );
      let hlY = cardY + 68;
      highlightLines.slice(0, 5).forEach((line) => {
        ctx.fillText(line, rightX + 22, hlY);
        hlY += 27;
      });
      ctx.restore();

      // 5. Faixa Inferior de Legenda Sincronizada (Estilo Vídeo-Aula)
      ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
      ctx.fillRect(0, H - 130, W, 130);

      // Linha de progresso da cena
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, H - 130, W, 5);
      ctx.fillStyle = "#6366f1";
      ctx.fillRect(0, H - 130, W * Math.min(1, Math.max(0.02, progress)), 5);

      // Texto da Legenda (mostra a janela de palavras correspondente ao progresso do áudio)
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 22px sans-serif";
      const subtitleLines = wrapCanvasText(ctx, scene.narrationText, W - 120);
      const totalSubLines = subtitleLines.length;
      // Exibe 2 linhas por vez sincronizadas com o progresso da fala
      const currentPairIndex =
        Math.floor(progress * Math.ceil(totalSubLines / 2)) * 2;
      const visibleLines = subtitleLines.slice(
        Math.min(currentPairIndex, Math.max(0, totalSubLines - 2)),
        Math.min(currentPairIndex, Math.max(0, totalSubLines - 2)) + 2
      );

      let subY = H - 78;
      visibleLines.forEach((line) => {
        const textWidth = ctx.measureText(line).width;
        ctx.fillText(line, (W - textWidth) / 2, subY);
        subY += 32;
      });

      // Indicador de onda sonora se estiver reproduzindo
      if (playing) {
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("● NARRAÇÃO ATIVA", 48, H - 22);
      }
    },
    [scenes.length]
  );

  // Atualiza o canvas sempre que a cena ou o progresso mudar
  useEffect(() => {
    renderSceneToCanvas(currentScene, sceneProgress, isPlaying);
  }, [currentScene, sceneProgress, isPlaying, renderSceneToCanvas]);

  const fetchSceneAudioBase64 = useCallback(
    async (scene: VideoScene, selectedVoice: "female" | "male") => {
      const key = `${scene.id}-${selectedVoice}`;
      if (audioCacheRef.current[key]) {
        return audioCacheRef.current[key];
      }

      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${scene.title}. ${scene.narrationText}`,
          voice: selectedVoice,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.audioBase64) {
        throw new Error(data.error || "Erro ao sintetizar áudio da cena.");
      }

      audioCacheRef.current[key] = data.audioBase64;
      return data.audioBase64 as string;
    },
    []
  );

  const playScene = useCallback(
    async (index: number, autoPlay = true) => {
      const target = scenes[index];
      if (!target) return;

      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      setActiveSceneIndex(index);
      setSceneProgress(0);

      if (!autoPlay) {
        setIsPlaying(false);
        return;
      }

      setIsLoadingScene(true);
      try {
        const base64 = await fetchSceneAudioBase64(target, voice);
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        const audio = audioRef.current;
        audio.src = `data:audio/mpeg;base64,${base64}`;

        const updateLoop = () => {
          if (audio.duration && !audio.paused) {
            const prog = Math.min(1, audio.currentTime / audio.duration);
            setSceneProgress(prog);
            animFrameRef.current = requestAnimationFrame(updateLoop);
          }
        };

        audio.onplay = () => {
          animFrameRef.current = requestAnimationFrame(updateLoop);
        };

        audio.ontimeupdate = () => {
          if (audio.duration) {
            setSceneProgress(Math.min(1, audio.currentTime / audio.duration));
          }
        };

        audio.onended = () => {
          setSceneProgress(1);
          if (index + 1 < scenes.length) {
            playScene(index + 1, true);
          } else {
            setIsPlaying(false);
          }
        };

        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn("Fallback de animação sem áudio de servidor:", err);
        setIsPlaying(false);
      } finally {
        setIsLoadingScene(false);
      }
    },
    [fetchSceneAudioBase64, scenes, voice]
  );

  const togglePlayPause = async () => {
    if (isLoadingScene || isExportingVideo) return;

    if (audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      await playScene(activeSceneIndex, true);
    }
  };

  // Exporta e baixa todas as cenas + narração como um arquivo de vídeo real (.webm)
  const handleExportWebmVideo = async () => {
    if (isExportingVideo) return;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsExportingVideo(true);
      setExportProgressText("Preparando áudios das cenas...");

      // 1. Garante que todas as cenas já tenham o MP3 sintetizado em cache
      for (let i = 0; i < scenes.length; i++) {
        setExportProgressText(
          `Sintetizando voz da cena ${i + 1} de ${scenes.length}...`
        );
        await fetchSceneAudioBase64(scenes[i], voice);
      }

      // 2. Configura captura do Canvas (30fps) + Web Audio API Stream
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      const canvasStream = canvas.captureStream(30);

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const recordedChunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      recorder.start(200);

      // 3. Reproduz e desenha cada cena sequencialmente gravando no MediaRecorder
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        setActiveSceneIndex(i);
        setExportProgressText(
          `Gravando vídeo: Cena ${i + 1} de ${scenes.length}...`
        );

        const base64 = await fetchSceneAudioBase64(scene, voice);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let b = 0; b < binary.length; b++) {
          bytes[b] = binary.charCodeAt(b);
        }

        const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest);
        source.connect(audioCtx.destination); // Permite ouvir enquanto exporta

        const sceneDuration = audioBuffer.duration;
        const startTime = performance.now();

        await new Promise<void>((resolve) => {
          const tick = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const prog = Math.min(1, elapsed / Math.max(0.1, sceneDuration));
            renderSceneToCanvas(scene, prog, true);
            if (elapsed < sceneDuration) {
              requestAnimationFrame(tick);
            }
          };

          source.onended = () => {
            renderSceneToCanvas(scene, 1, false);
            resolve();
          };

          source.start(0);
          requestAnimationFrame(tick);
        });
      }

      recorder.stop();
      await new Promise<void>((r) => {
        recorder.onstop = () => r();
      });

      await audioCtx.close();

      const videoBlob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${media.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-video-explicativo.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Não foi possível exportar o arquivo de vídeo neste navegador."
      );
    } finally {
      setIsExportingVideo(false);
      setExportProgressText("");
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Container do Player de Vídeo Explicativo */}
      <div
        ref={containerRef}
        className="rounded-3xl bg-slate-950 border border-indigo-500/30 overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Barra Superior do Player */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {media.title}
              </h3>
              <p className="text-[11px] text-slate-400">
                Cena {currentScene.sceneNumber} de {scenes.length} • Baseado na
                Página #{currentScene.sourcePage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Escolha de voz do vídeo */}
            <div className="inline-flex rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setVoice("female")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  voice === "female"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Voz Feminina
              </button>
              <button
                type="button"
                onClick={() => setVoice("male")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  voice === "male"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Voz Masculina
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportWebmVideo}
              disabled={isExportingVideo}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition cursor-pointer disabled:opacity-60"
              title="Renderizar e baixar o vídeo explicativo completo (.webm)"
            >
              {isExportingVideo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{exportProgressText || "Gravando vídeo..."}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Vídeo (.webm)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tela 16:9 do Vídeo (Canvas HD 1280x720) */}
        <div
          onClick={togglePlayPause}
          className="relative aspect-video w-full bg-slate-950 flex items-center justify-center cursor-pointer group"
        >
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-contain"
          />

          {/* Botão Central de Play quando pausado */}
          {!isPlaying && !isLoadingScene && !isExportingVideo && (
            <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center transition-opacity">
              <div className="w-20 h-20 rounded-full bg-indigo-600/95 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/50 scale-100 group-hover:scale-105 transition-transform">
                <Play className="w-9 h-9 fill-current ml-1" />
              </div>
            </div>
          )}

          {/* Overlay de carregamento da voz */}
          {(isLoadingScene || isExportingVideo) && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
              <p className="text-sm font-semibold">
                {isExportingVideo
                  ? exportProgressText
                  : "Sincronizando narração e slides da cena..."}
              </p>
            </div>
          )}
        </div>

        {/* Barra de Controles Inferiores do Player */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => playScene(activeSceneIndex - 1, true)}
              disabled={activeSceneIndex === 0 || isLoadingScene || isExportingVideo}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 transition cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              disabled={isLoadingScene || isExportingVideo}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition cursor-pointer disabled:opacity-50"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pausar Vídeo</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Assistir Aula</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => playScene(activeSceneIndex + 1, true)}
              disabled={
                activeSceneIndex === scenes.length - 1 ||
                isLoadingScene ||
                isExportingVideo
              }
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 transition cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Seletor rápido de cenas (Timeline) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {scenes.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => playScene(idx, true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  idx === activeSceneIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Cena {s.sceneNumber}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Tela cheia"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Roteiro de Cenas Abaixo do Vídeo */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Roteiro Visual por Cena ({scenes.length} cenas)</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clique em qualquer cena para pular diretamente para aquele ponto da explicação.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToStudy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
          >
            <span>Voltar ao Resumo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {scenes.map((scene, idx) => {
            const isCurrent = idx === activeSceneIndex;
            return (
              <div
                key={scene.id}
                onClick={() => playScene(idx, true)}
                className={`rounded-2xl p-4 border transition cursor-pointer space-y-2 ${
                  isCurrent
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/30"
                    : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Cena {scene.sceneNumber} • Pág. #{scene.sourcePage}
                  </span>
                  {isCurrent && isPlaying && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Volume2 className="w-3 h-3 animate-pulse" />
                      Reproduzindo
                    </span>
                  )}
                </div>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                  {scene.title}
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {scene.narrationText}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
