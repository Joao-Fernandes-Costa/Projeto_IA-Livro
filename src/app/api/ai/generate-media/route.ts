import { NextRequest, NextResponse } from "next/server";
import { generateStudyMediaFromStudy } from "@/lib/lecture/lecture-generator";
import { StudyAnalysis } from "@/lib/ai/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.studyAnalysis) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Os dados de análise das páginas (studyAnalysis) são obrigatórios para gerar o audiobook e o vídeo.",
        },
        { status: 400 }
      );
    }

    const studyAnalysis: StudyAnalysis = body.studyAnalysis;
    const media = await generateStudyMediaFromStudy(studyAnalysis);

    return NextResponse.json({
      success: true,
      media,
    });
  } catch (error: unknown) {
    console.error("[Generate Media Error]:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno ao gerar o audiobook e o vídeo explicativo.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
