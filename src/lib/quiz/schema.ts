import { z } from "zod";
import { stripMarkdownFences } from "../ai/response-parser";

export const QuizDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type QuizDifficulty = z.infer<typeof QuizDifficultySchema>;

export const QuizOptionSchema = z.object({
  id: z.enum(["a", "b", "c", "d"]),
  text: z.string().min(1, "O texto da alternativa não pode ser vazio"),
});
export type QuizOption = z.infer<typeof QuizOptionSchema>;

/**
 * Schema completo mantido estritamente no servidor (com gabarito e explicação).
 */
export const QuizQuestionServerSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(5, "A pergunta deve ter ao menos 5 caracteres"),
  options: z
    .array(QuizOptionSchema)
    .length(4, "Cada questão deve possuir exatamente 4 alternativas (a, b, c, d)"),
  correctOptionId: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().min(5, "A explicação da resposta correta é obrigatória"),
  sourcePages: z
    .array(z.number().int().positive())
    .min(1, "Deve indicar ao menos uma página de origem"),
  difficulty: QuizDifficultySchema,
});
export type QuizQuestionServer = z.infer<typeof QuizQuestionServerSchema>;

export const QuizGenerationServerSchema = z.object({
  title: z.string().optional(),
  questions: z
    .array(QuizQuestionServerSchema)
    .min(5, "O questionário deve ter no mínimo 5 questões")
    .max(10, "O questionário deve ter no máximo 10 questões"),
});
export type QuizGenerationServer = z.infer<typeof QuizGenerationServerSchema>;

/**
 * Schema público do questionário entregue ao navegador (NUNCA contém gabarito).
 */
export const QuizQuestionPublicSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(QuizOptionSchema),
  difficulty: QuizDifficultySchema,
  sourcePages: z.array(z.number()),
});
export type QuizQuestionPublic = z.infer<typeof QuizQuestionPublicSchema>;

export const QuizPublicSchema = z.object({
  quizId: z.string(),
  title: z.string(),
  totalQuestions: z.number().int().positive(),
  questions: z.array(QuizQuestionPublicSchema),
});
export type QuizPublic = z.infer<typeof QuizPublicSchema>;

/**
 * Schema de envio de respostas pelo usuário.
 * Suporta tanto { q1: "b" } quanto [ { questionId: "q1", selectedOptionId: "b" } ].
 */
export const QuizSubmissionSchema = z.object({
  quizId: z.string().min(1, "quizId é obrigatório"),
  answers: z.union([
    z.record(z.string(), z.string()),
    z.record(z.string(), z.unknown()),
    z.array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionId: z.string().min(1),
      })
    ),
  ]),
});
export type QuizSubmission = z.infer<typeof QuizSubmissionSchema>;

/**
 * Schema do resultado da avaliação retornado pelo servidor.
 */
export const QuizQuestionResultSchema = z.object({
  questionId: z.string(),
  correct: z.boolean(),
  selectedOptionId: z.string(),
  correctOptionId: z.string(),
  explanation: z.string(),
});
export type QuizQuestionResult = z.infer<typeof QuizQuestionResultSchema>;

export const QuizEvaluationResultSchema = z.object({
  score: z.number().int().min(0),
  total: z.number().int().positive(),
  percentage: z.number().min(0).max(100),
  results: z.array(QuizQuestionResultSchema),
});
export type QuizEvaluationResult = z.infer<typeof QuizEvaluationResultSchema>;

/**
 * Sanitiza e normaliza saídas brutas do modelo de IA para o schema validado Zod.
 */
export function parseAndValidateQuizGeneration(
  rawOutput: string,
  availablePages: number[] = [1]
): QuizGenerationServer {
  const cleaned = stripMarkdownFences(rawOutput);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `O modelo de IA não retornou um formato JSON válido para o questionário. Conteúdo recebido: ${rawOutput.slice(0, 150)}...`
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("A resposta da IA para o questionário não é um objeto JSON válido.");
  }

  const rawObj = parsed as Record<string, unknown>;
  const rawQuestions = Array.isArray(rawObj.questions)
    ? rawObj.questions
    : Array.isArray(parsed)
    ? parsed
    : [];

  if (rawQuestions.length === 0) {
    throw new Error("O modelo de IA não retornou perguntas na estrutura esperada.");
  }

  const fallbackPages = availablePages.length > 0 ? availablePages : [1];

  // Normalização defensiva para garantir que opções a, b, c, d estejam corretas
  const normalizedQuestions = rawQuestions.map((q: unknown, qIdx: number) => {
    const item = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
    const qId = String(item.id || `q${qIdx + 1}`);
    const questionText = String(item.question || `Questão ${qIdx + 1} sobre o material estudado`);

    // Normaliza alternativas
    const rawOptions = Array.isArray(item.options) ? item.options : [];
    const validLetters: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
    const options: QuizOption[] = validLetters.map((letter, optIdx) => {
      const existing = rawOptions[optIdx] as Record<string, unknown> | string | undefined;
      let text = "";
      if (typeof existing === "string") {
        text = existing;
      } else if (existing && typeof existing === "object") {
        text = String(existing.text || existing.option || existing.label || "");
      }
      return {
        id: letter,
        text: text.trim() || `Alternativa ${letter.toUpperCase()}`,
      };
    });

    // Normaliza resposta correta
    let correctId = String(item.correctOptionId || "a").toLowerCase().trim();
    if (!["a", "b", "c", "d"].includes(correctId)) {
      if (correctId.startsWith("a") || correctId.includes("1")) correctId = "a";
      else if (correctId.startsWith("b") || correctId.includes("2")) correctId = "b";
      else if (correctId.startsWith("c") || correctId.includes("3")) correctId = "c";
      else if (correctId.startsWith("d") || correctId.includes("4")) correctId = "d";
      else correctId = "a";
    }

    // Normaliza páginas de origem
    let sourcePages: number[] = [];
    if (Array.isArray(item.sourcePages)) {
      sourcePages = item.sourcePages
        .map((p) => Number(p))
        .filter((p) => !isNaN(p) && p > 0);
    }
    if (sourcePages.length === 0) {
      sourcePages = [fallbackPages[qIdx % fallbackPages.length]];
    }

    // Normaliza dificuldade
    let difficulty: QuizDifficulty = "medium";
    const rawDiff = String(item.difficulty || "").toLowerCase();
    if (rawDiff === "easy" || rawDiff === "facil" || rawDiff === "fácil") {
      difficulty = "easy";
    } else if (rawDiff === "hard" || rawDiff === "dificil" || rawDiff === "difícil") {
      difficulty = "hard";
    }

    const explanation = String(
      item.explanation ||
        `Esta alternativa está correta com base no conteúdo abordado na página ${sourcePages.join(", ")}.`
    ).trim();

    return {
      id: qId,
      question: questionText,
      options,
      correctOptionId: correctId as "a" | "b" | "c" | "d",
      explanation,
      sourcePages,
      difficulty,
    };
  });

  // Limita estritamente entre 5 e 10 questões
  const clampedQuestions = normalizedQuestions.slice(0, 10);
  if (clampedQuestions.length < 5) {
    throw new Error(
      `O modelo gerou apenas ${clampedQuestions.length} questões. São necessárias no mínimo 5 questões.`
    );
  }

  return QuizGenerationServerSchema.parse({
    title: typeof rawObj.title === "string" ? rawObj.title : "Questionário de Fixação",
    questions: clampedQuestions,
  });
}
