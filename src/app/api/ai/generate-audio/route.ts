import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateAudioScript } from "@/lib/ai/audio-script";
import { TTSSettingsStore } from "@/lib/tts/tts-settings-store";
import { StudyAnalysis } from "@/lib/ai/schema";

export const maxDuration = 60;

const GenerateAudioRequestSchema = z.object({
  studyAnalysis: z.object({
    totalPages: z.number().int().positive().optional(),
    processedPages: z.number().int().min(0).optional(),
    failedPages: z.number().int().min(0).optional(),
    fullText: z.string().optional(),
    pageAnalyses: z.array(z.any()).optional(),
    importantConcepts: z.array(z.string()).optional(),
    summaries: z.array(z.string()).optional(),
    averageConfidence: z.number().optional(),
    errors: z.array(z.any()).optional(),
  }),
  mode: z.enum(["browser", "server"]).default("browser"),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    const validation = GenerateAudioRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros da requisição inválidos.",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { studyAnalysis, mode } = validation.data;

    const hasPages = Array.isArray(studyAnalysis.pageAnalyses) && studyAnalysis.pageAnalyses.length > 0;
    const hasText = typeof studyAnalysis.fullText === "string" && studyAnalysis.fullText.trim().length > 0;

    if (!hasPages && !hasText) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhum conteúdo legível foi encontrado nas páginas. Processe o material antes de gerar a explicação em áudio.",
        },
        { status: 400 }
      );
    }

    // Gera o roteiro didático utilizando a IA ativa no sistema e o conteúdo real das páginas
    const { script, durationEstimate, wordCount } = await generateAudioScript(
      studyAnalysis as unknown as StudyAnalysis
    );

    // Regra obrigatória: Não retornar sucesso se o roteiro estiver vazio
    if (!script || script.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na geração: o roteiro didático retornado está vazio.",
        },
        { status: 500 }
      );
    }

    const ttsSettings = TTSSettingsStore.getConfiguration();

    return NextResponse.json({
      success: true,
      mode,
      provider: ttsSettings.provider,
      script,
      durationEstimate,
      wordCount,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro interno ao gerar a explicação em áudio.";
    console.error("[generate-audio] Erro ao gerar áudio:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
