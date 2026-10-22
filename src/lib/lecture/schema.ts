import { z } from "zod";

export const AudiobookChapterSchema = z.object({
  id: z.string(),
  chapterNumber: z.number().int().positive(),
  title: z.string().min(2),
  narrationText: z.string().min(10),
  keySummary: z.string(),
  sourcePages: z.array(z.number().int().positive()).min(1),
});

export const VideoVisualHighlightSchema = z.object({
  type: z.enum(["concept", "formula", "quote", "summary"]),
  label: z.string(),
  content: z.string(),
});

export const VideoSceneSchema = z.object({
  id: z.string(),
  sceneNumber: z.number().int().positive(),
  title: z.string().min(2),
  subtitle: z.string(),
  narrationText: z.string().min(10),
  bulletPoints: z.array(z.string()).min(1).max(5),
  visualHighlight: VideoVisualHighlightSchema,
  sourcePage: z.number().int().positive(),
});

export const StudyMediaPackageSchema = z.object({
  title: z.string().min(2),
  overview: z.string(),
  audiobookChapters: z.array(AudiobookChapterSchema).min(1),
  videoScenes: z.array(VideoSceneSchema).min(1),
});

export type AudiobookChapter = z.infer<typeof AudiobookChapterSchema>;
export type VideoVisualHighlight = z.infer<typeof VideoVisualHighlightSchema>;
export type VideoScene = z.infer<typeof VideoSceneSchema>;
export type StudyMediaPackage = z.infer<typeof StudyMediaPackageSchema>;

/**
 * Extrai, sanitiza e valida o JSON do pacote de mídia (Audiobook + Vídeo Explicativo)
 * retornado pelos provedores de IA.
 */
export function parseAndValidateStudyMedia(
  rawOutput: string,
  availablePages: number[] = [1]
): StudyMediaPackage {
  let cleaned = rawOutput.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `O modelo de IA não retornou um JSON válido para o Audiobook/Vídeo. Trecho recebido: ${rawOutput.slice(0, 200)}...`
    );
  }

  const defaultPage = availablePages[0] || 1;

  const rawChapters = Array.isArray(parsed.audiobookChapters)
    ? parsed.audiobookChapters
    : [];

  const normalizedChapters: AudiobookChapter[] = rawChapters
    .filter((c): c is Record<string, unknown> => c !== null && typeof c === "object")
    .map((c, idx) => {
      const rawPages = Array.isArray(c.sourcePages)
        ? c.sourcePages
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n) && n > 0)
        : [];

      return {
        id: typeof c.id === "string" && c.id.trim() ? c.id.trim() : `chap-${idx + 1}`,
        chapterNumber: idx + 1,
        title:
          typeof c.title === "string" && c.title.trim()
            ? c.title.trim()
            : `Capítulo ${idx + 1}`,
        narrationText:
          typeof c.narrationText === "string" && c.narrationText.trim().length >= 10
            ? c.narrationText.trim()
            : typeof c.keySummary === "string" && c.keySummary.trim().length >= 10
            ? c.keySummary.trim()
            : "Neste trecho do material, exploramos os conceitos essenciais apresentados na página estudada.",
        keySummary:
          typeof c.keySummary === "string" && c.keySummary.trim()
            ? c.keySummary.trim()
            : "Síntese dos pontos centrais abordados neste capítulo.",
        sourcePages: rawPages.length > 0 ? rawPages : [availablePages[idx % availablePages.length] || defaultPage],
      };
    });

  const rawScenes = Array.isArray(parsed.videoScenes) ? parsed.videoScenes : [];

  const normalizedScenes: VideoScene[] = rawScenes
    .filter((s): s is Record<string, unknown> => s !== null && typeof s === "object")
    .map((s, idx) => {
      const rawBullets = Array.isArray(s.bulletPoints)
        ? s.bulletPoints.map((b) => String(b).trim()).filter(Boolean).slice(0, 5)
        : [];

      const rawHighlight =
        s.visualHighlight && typeof s.visualHighlight === "object"
          ? (s.visualHighlight as Record<string, unknown>)
          : {};

      const validTypes = ["concept", "formula", "quote", "summary"] as const;
      const highlightType = validTypes.includes(rawHighlight.type as (typeof validTypes)[number])
        ? (rawHighlight.type as (typeof validTypes)[number])
        : "concept";

      const pageNum = Number(s.sourcePage);
      const validPage =
        Number.isInteger(pageNum) && pageNum > 0
          ? pageNum
          : availablePages[idx % availablePages.length] || defaultPage;

      return {
        id: typeof s.id === "string" && s.id.trim() ? s.id.trim() : `scene-${idx + 1}`,
        sceneNumber: idx + 1,
        title:
          typeof s.title === "string" && s.title.trim()
            ? s.title.trim()
            : `Cena ${idx + 1}`,
        subtitle:
          typeof s.subtitle === "string" && s.subtitle.trim()
            ? s.subtitle.trim()
            : `Explicação visual • Página ${validPage}`,
        narrationText:
          typeof s.narrationText === "string" && s.narrationText.trim().length >= 10
            ? s.narrationText.trim()
            : "Vamos observar os pontos principais destacados nesta página do livro.",
        bulletPoints:
          rawBullets.length > 0
            ? rawBullets
            : ["Compreensão dos fundamentos apresentados na página."],
        visualHighlight: {
          type: highlightType,
          label:
            typeof rawHighlight.label === "string" && rawHighlight.label.trim()
              ? rawHighlight.label.trim()
              : "Destaque Didático",
          content:
            typeof rawHighlight.content === "string" && rawHighlight.content.trim()
              ? rawHighlight.content.trim()
              : rawBullets[0] || "Conceito fundamental para fixação da matéria.",
        },
        sourcePage: validPage,
      };
    });

  const normalizedPackage = {
    title:
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : "Aula & Audiobook Explicativo",
    overview:
      typeof parsed.overview === "string" && parsed.overview.trim()
        ? parsed.overview.trim()
        : "Explicação guiada em áudio e vídeo baseada nas páginas enviadas.",
    audiobookChapters:
      normalizedChapters.length > 0
        ? normalizedChapters
        : [
            {
              id: "chap-1",
              chapterNumber: 1,
              title: "Visão Geral do Conteúdo",
              narrationText:
                "Bem-vindo ao seu audiobook de estudo. Vamos revisar os conceitos centrais extraídos das páginas do seu livro.",
              keySummary: "Introdução e revisão dos tópicos principais.",
              sourcePages: [defaultPage],
            },
          ],
    videoScenes:
      normalizedScenes.length > 0
        ? normalizedScenes
        : [
            {
              id: "scene-1",
              sceneNumber: 1,
              title: "Resumo Visual do Conteúdo",
              subtitle: `Página ${defaultPage}`,
              narrationText:
                "Nesta cena, resumimos os pontos mais importantes extraídos da leitura do seu livro.",
              bulletPoints: ["Conceitos principais extraídos com fidelidade."],
              visualHighlight: {
                type: "summary" as const,
                label: "Ponto Chave",
                content: "Síntese estruturada para revisão rápida.",
              },
              sourcePage: defaultPage,
            },
          ],
  };

  return StudyMediaPackageSchema.parse(normalizedPackage);
}
