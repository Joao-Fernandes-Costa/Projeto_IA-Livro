import { NextRequest, NextResponse } from "next/server";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { generateQuizFromStudy } from "@/lib/quiz/quiz-generator";
import { QuizStore } from "@/lib/quiz/quiz-store";
import { StudyAnalysis } from "@/lib/ai/schema";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido. Envie o objeto studyAnalysis." },
        { status: 400 }
      );
    }

    // Aceita tanto { studyAnalysis: ... } quanto o objeto studyAnalysis diretamente
    const studyAnalysis: StudyAnalysis = (body.studyAnalysis || body) as StudyAnalysis;

    const hasPages = Array.isArray(studyAnalysis.pageAnalyses) && studyAnalysis.pageAnalyses.length > 0;
    const hasText = typeof studyAnalysis.fullText === "string" && studyAnalysis.fullText.trim().length > 0;

    if (!hasPages && !hasText) {
      return NextResponse.json(
        {
          error:
            "Nenhum conteúdo de estudo foi encontrado nas páginas. É necessário processar ao menos uma página antes de gerar o questionário.",
        },
        { status: 400 }
      );
    }

    // Obtém o provider ativo configurado na AIProviderFactory
    const provider = AIProviderFactory.getProvider();

    // Gera o questionário usando estritamente o conteúdo enviado e o provedor ativo
    const quizServer = await generateQuizFromStudy(studyAnalysis, provider);

    // Salva o gabarito no servidor e obtém a versão pública desprovida de respostas
    const publicQuiz = QuizStore.saveQuiz(quizServer);

    return NextResponse.json({
      success: true,
      quiz: publicQuiz,
      provider: provider.name,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro interno ao gerar o questionário interativo.";
    console.error("[generate-quiz] Erro na geração do quiz:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
