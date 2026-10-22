import crypto from "crypto";
import {
  QuizEvaluationResult,
  QuizGenerationServer,
  QuizPublic,
  QuizQuestionPublic,
  QuizQuestionResult,
  QuizQuestionServer,
} from "./schema";

export interface StoredQuiz {
  id: string;
  title: string;
  createdAt: number;
  questions: QuizQuestionServer[];
}

// Persistência em memória resiliente ao Fast Refresh do Next.js em dev
declare global {
  // eslint-disable-next-line no-var
  var __estudeai_quiz_store__: Map<string, StoredQuiz> | undefined;
}

const quizMap: Map<string, StoredQuiz> =
  globalThis.__estudeai_quiz_store__ ?? new Map<string, StoredQuiz>();

if (process.env.NODE_ENV !== "production") {
  globalThis.__estudeai_quiz_store__ = quizMap;
}

const QUIZ_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

function cleanExpiredQuizzes() {
  const now = Date.now();
  for (const [id, quiz] of quizMap.entries()) {
    if (now - quiz.createdAt > QUIZ_TTL_MS) {
      quizMap.delete(id);
    }
  }
}

export class QuizStore {
  /**
   * Salva o questionário completo no servidor (com gabarito e explicação)
   * e retorna a versão pública estritamente desprovida de respostas.
   */
  static saveQuiz(generation: QuizGenerationServer, customId?: string): QuizPublic {
    cleanExpiredQuizzes();

    const quizId = customId || crypto.randomUUID();
    const stored: StoredQuiz = {
      id: quizId,
      title: generation.title || "Questionário de Fixação",
      createdAt: Date.now(),
      questions: generation.questions,
    };

    quizMap.set(quizId, stored);

    const publicQuestions: QuizQuestionPublic[] = stored.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      sourcePages: q.sourcePages,
    }));

    return {
      quizId,
      title: stored.title,
      totalQuestions: publicQuestions.length,
      questions: publicQuestions,
    };
  }

  /**
   * Obtém a versão pública de um questionário já armazenado.
   */
  static getPublicQuiz(quizId: string): QuizPublic | null {
    cleanExpiredQuizzes();
    const stored = quizMap.get(quizId);
    if (!stored) return null;

    const publicQuestions: QuizQuestionPublic[] = stored.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      sourcePages: q.sourcePages,
    }));

    return {
      quizId: stored.id,
      title: stored.title,
      totalQuestions: publicQuestions.length,
      questions: publicQuestions,
    };
  }

  /**
   * Obtém o questionário interno (apenas para uso server-side).
   */
  static getInternalQuiz(quizId: string): StoredQuiz | null {
    cleanExpiredQuizzes();
    return quizMap.get(quizId) ?? null;
  }

  /**
   * Avalia as respostas do usuário confrontando com o gabarito guardado no servidor.
   */
  static evaluate(
    quizId: string,
    answersInput:
      | Record<string, unknown>
      | Array<{ questionId: string; selectedOptionId: string }>
  ): QuizEvaluationResult {
    cleanExpiredQuizzes();
    const stored = quizMap.get(quizId);
    if (!stored) {
      throw new Error("Questionário não encontrado ou expirado no servidor. Por favor, gere um novo questionário.");
    }

    // Normaliza mapa de respostas
    const answersMap = new Map<string, string>();
    if (Array.isArray(answersInput)) {
      for (const item of answersInput) {
        if (item.questionId && item.selectedOptionId) {
          answersMap.set(String(item.questionId).trim(), String(item.selectedOptionId).trim().toLowerCase());
        }
      }
    } else if (answersInput && typeof answersInput === "object") {
      for (const [key, val] of Object.entries(answersInput)) {
        if (key && val) {
          answersMap.set(String(key).trim(), String(val).trim().toLowerCase());
        }
      }
    }

    let score = 0;
    const results: QuizQuestionResult[] = stored.questions.map((q) => {
      const selected = answersMap.get(q.id) || "";
      const isCorrect = selected.length > 0 && selected === q.correctOptionId.toLowerCase();
      if (isCorrect) {
        score++;
      }

      return {
        questionId: q.id,
        correct: isCorrect,
        selectedOptionId: selected,
        correctOptionId: q.correctOptionId,
        explanation: q.explanation,
      };
    });

    const total = stored.questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    return {
      score,
      total,
      percentage,
      results,
    };
  }
}
