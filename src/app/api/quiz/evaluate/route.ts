import { NextRequest, NextResponse } from "next/server";
import { QuizSubmissionSchema } from "@/lib/quiz/schema";
import { QuizStore } from "@/lib/quiz/quiz-store";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    const validation = QuizSubmissionSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Formato de respostas inválido.",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { quizId, answers } = validation.data;

    // Avalia no QuizStore server-side confrontando com o gabarito protegido
    const evaluation = QuizStore.evaluate(quizId, answers);

    return NextResponse.json({
      success: true,
      quizId,
      ...evaluation,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro interno ao avaliar as respostas do questionário.";
    console.error("[evaluate-quiz] Erro na avaliação do quiz:", error);

    const isNotFound = message.toLowerCase().includes("não encontrado");
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
