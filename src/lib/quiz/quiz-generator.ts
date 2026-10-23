import { AIProvider } from "@/types/ai";
import { AIProviderFactory } from "../ai/provider-factory";
import { AISettingsStore } from "../ai/settings-store";
import { SecretStore } from "../security/secret-store";
import { extractContentFromRawBody } from "../ai/response-parser";
import { StudyAnalysis } from "../ai/schema";
import {
  QuizDifficulty,
  QuizGenerationServer,
  QuizGenerationServerSchema,
  QuizOption,
  QuizQuestionServer,
  parseAndValidateQuizGeneration,
} from "./schema";

export const QUIZ_SYSTEM_PROMPT = `Você é um tutor pedagógico e especialista em avaliação do EstudeAI.
Sua missão é gerar um questionário de fixação interativo com 5 a 10 questões de múltipla escolha baseado EXCLUSIVAMENTE nas páginas reais analisadas do material de estudo.

DIRETRIZES FUNDAMENTAIS:
1. QUANTIDADE: Gere entre 5 e 10 questões (preferencialmente entre 5 e 8 para garantir alto valor pedagógico).
2. ESTRUTURA: Cada questão DEVE ter rigorosamente 4 alternativas com IDs "a", "b", "c", "d".
3. GABARITO: "correctOptionId" deve ser exatamente "a", "b", "c" ou "d". Apenas UMA alternativa é correta.
4. EXPLICAÇÃO: "explanation" é obrigatória, explicando com clareza o motivo do acerto com base no texto estudado.
5. PÁGINAS DE ORIGEM: "sourcePages" deve conter a lista dos números inteiros das páginas em que o conceito se fundamenta (ex: [1] ou [1, 2]).
6. DIFICULDADE: "difficulty" deve ser "easy", "medium" ou "hard".
7. FIDELIDADE AO CONTEÚDO: Nunca invente informações ou conceitos não presentes no material enviado.
8. FORMATO: Responda APENAS em JSON válido, sem texto introdutório ou notas fora da estrutura JSON.

Formato JSON esperado:
{
  "title": "Questionário de Fixação: [Título ou Tema Principal]",
  "questions": [
    {
      "id": "q1",
      "question": "Pergunta objetiva e clara...",
      "options": [
        { "id": "a", "text": "Texto da alternativa A" },
        { "id": "b", "text": "Texto da alternativa B" },
        { "id": "c", "text": "Texto da alternativa C" },
        { "id": "d", "text": "Texto da alternativa D" }
      ],
      "correctOptionId": "b",
      "explanation": "Explicação fundamentada no conteúdo estudado...",
      "sourcePages": [1],
      "difficulty": "easy"
    }
  ]
}`;

export function formatStudyContentForPrompt(studyAnalysis: StudyAnalysis): string {
  const parts: string[] = [];

  if (studyAnalysis.pageAnalyses && studyAnalysis.pageAnalyses.length > 0) {
    for (const page of studyAnalysis.pageAnalyses) {
      parts.push(`=== PÁGINA ${page.pageNumber} ${page.title ? `- ${page.title}` : ""} ===`);
      if (page.summary) {
        parts.push(`Resumo da página: ${page.summary}`);
      }
      if (page.importantConcepts && page.importantConcepts.length > 0) {
        parts.push(`Conceitos-chave: ${page.importantConcepts.join(", ")}`);
      }
      if (page.sections && page.sections.length > 0) {
        for (const s of page.sections) {
          parts.push(`[${s.title}]\n${s.content}`);
        }
      }
      if (page.extractedText) {
        parts.push(`Texto extraído da página:\n${page.extractedText}`);
      }
      parts.push("\n");
    }
  } else if (studyAnalysis.fullText) {
    parts.push(`Texto consolidado das páginas do material:\n${studyAnalysis.fullText}`);
  }

  return parts.join("\n");
}

export function extractAvailablePageNumbers(studyAnalysis: StudyAnalysis): number[] {
  if (studyAnalysis.pageAnalyses && studyAnalysis.pageAnalyses.length > 0) {
    return studyAnalysis.pageAnalyses
      .map((p) => p.pageNumber)
      .filter((n) => typeof n === "number" && n > 0);
  }
  return [1];
}

/**
 * Gera dinamicamente um questionário válido a partir do conteúdo real do studyAnalysis
 * para uso exclusivo quando o MockProvider estiver ativo.
 */
export function generateMockQuizFromStudy(studyAnalysis: StudyAnalysis): QuizGenerationServer {
  const availablePages = extractAvailablePageNumbers(studyAnalysis);
  const pages = studyAnalysis.pageAnalyses && studyAnalysis.pageAnalyses.length > 0
    ? studyAnalysis.pageAnalyses
    : [
        {
          pageNumber: 1,
          title: "Conteúdo do Material",
          extractedText: studyAnalysis.fullText || "Conteúdo de introdução aos princípios estudados.",
          sections: [{ title: "Introdução", content: "Conceitos fundamentais abordados nas páginas." }],
          summary: studyAnalysis.summaries?.[0] || "Síntese dos conceitos principais do livro.",
          importantConcepts: studyAnalysis.importantConcepts || ["Princípios Teóricos", "Aplicações Práticas"],
          formulasOrTables: [],
          confidence: 0.95,
        },
      ];

  const allConcepts = Array.from(
    new Set([
      ...(studyAnalysis.importantConcepts || []),
      ...pages.flatMap((p) => p.importantConcepts || []),
      "Fundamentação teórica",
      "Relação causa e efeito",
      "Aplicações didáticas",
      "Síntese conceitual",
    ])
  );

  const questions: QuizQuestionServer[] = [];
  const difficulties: QuizDifficulty[] = ["easy", "medium", "medium", "hard", "easy", "medium"];
  const correctLetters: Array<"a" | "b" | "c" | "d"> = ["b", "a", "c", "d", "b", "a"];

  const numQuestions = Math.max(5, Math.min(8, pages.length >= 3 ? pages.length * 2 : 5));

  for (let i = 0; i < numQuestions; i++) {
    const pageIndex = i % pages.length;
    const page = pages[pageIndex];
    const pageNum = page.pageNumber || availablePages[pageIndex % availablePages.length] || 1;
    const concept = allConcepts[i % allConcepts.length] || `Conceito Principal da Página ${pageNum}`;
    const nextConcept = allConcepts[(i + 1) % allConcepts.length] || "Análise secundária";
    const thirdConcept = allConcepts[(i + 2) % allConcepts.length] || "Exemplificação";
    const correctLetter = correctLetters[i % correctLetters.length];
    const difficulty = difficulties[i % difficulties.length];

    const correctText = page.summary
      ? `Conforme a página ${pageNum}, destaca-se: ${page.summary.slice(0, 100)}...`
      : `O foco central abordado é a relação direta de ${concept} com o tema em estudo.`;

    const options: QuizOption[] = [
      {
        id: "a",
        text:
          correctLetter === "a"
            ? correctText
            : `Foco restrito a definições isoladas de ${thirdConcept}, sem relação com o contexto geral.`,
      },
      {
        id: "b",
        text:
          correctLetter === "b"
            ? correctText
            : `Aplicação genérica de ${nextConcept} desconsiderando a base teórica apresentada.`,
      },
      {
        id: "c",
        text:
          correctLetter === "c"
            ? correctText
            : `Contradição direta dos argumentos apresentados na página ${pageNum} sobre o conteúdo.`,
      },
      {
        id: "d",
        text:
          correctLetter === "d"
            ? correctText
            : `Suposição externa não fundamentada no material didático referente a ${concept}.`,
      },
    ];

    questions.push({
      id: `q${i + 1}`,
      question: `De acordo com a página ${pageNum} do material estudado, qual afirmação representa fielmente a abordagem sobre "${concept}"?`,
      options,
      correctOptionId: correctLetter,
      explanation: `Com base nas informações da página ${pageNum}, a alternativa correta é a letra ${correctLetter.toUpperCase()} porque sintetiza adequadamente o conteúdo e os conceitos trabalhados no texto.`,
      sourcePages: [pageNum],
      difficulty,
    });
  }

  return QuizGenerationServerSchema.parse({
    title: pages[0]?.title ? `Questionário: ${pages[0].title}` : "Questionário de Fixação do Estudo",
    questions,
  });
}

/**
 * Gera o questionário de fixação utilizando o provider e modelo ativos no sistema.
 * Não utiliza perguntas fixas nem MockProvider, salvo quando o provedor mock estiver explicitamente selecionado.
 */
export async function generateQuizFromStudy(
  studyAnalysis: StudyAnalysis,
  providerInstance?: AIProvider
): Promise<QuizGenerationServer> {
  const provider = providerInstance || AIProviderFactory.getProvider();
  const availablePages = extractAvailablePageNumbers(studyAnalysis);

  const textContent = formatStudyContentForPrompt(studyAnalysis);
  if (!textContent || textContent.trim().length === 0) {
    throw new Error(
      "Nenhum conteúdo legível foi encontrado nas páginas selecionadas. Verifique se as páginas foram processadas antes de gerar o questionário."
    );
  }

  // 1. Caso seja Mock Provider explicitamente selecionado
  if (provider.name === "mock") {
    return generateMockQuizFromStudy(studyAnalysis);
  }

  const promptUser = `Abaixo está o conteúdo extraído das páginas do material de estudo.
Gere entre 5 e 10 questões pedagógicas de múltipla escolha baseando-se estritamente neste texto.

CONTEÚDO DO MATERIAL:
${textContent}

Lembre-se de retornar APENAS o JSON estruturado conforme orientado.`;

  // 2. Provedores baseados na API OpenAI-compatible (OpenRouter, Custom/9Router, OpenAI)
  if (provider.name === "openrouter" || provider.name === "custom" || provider.name === "openai") {
    const creds = AISettingsStore.getProviderCredentials(provider.name);
    let baseUrl = creds.baseUrl || "";
    let model = creds.model || "";
    let apiKey = creds.apiKey || "";

    if (provider.name === "openrouter") {
      baseUrl = baseUrl || "https://openrouter.ai/api/v1";
      model = model || "google/gemini-flash-1.5";
      if (!apiKey) {
        const stored = SecretStore.getSecretSync("openrouter");
        if (stored?.apiKey) apiKey = stored.apiKey;
        if (stored?.model) model = stored.model;
        if (stored?.baseUrl) baseUrl = stored.baseUrl;
      }
      if (!apiKey && process.env.OPENROUTER_API_KEY) {
        apiKey = process.env.OPENROUTER_API_KEY;
      }
      if (!apiKey) {
        throw new Error(
          "Chave de API do OpenRouter não configurada. Configure a API key no painel de configurações para utilizar este provedor."
        );
      }
    } else if (provider.name === "openai") {
      baseUrl = baseUrl || "https://api.openai.com/v1";
      model = model || "gpt-4o-mini";
      if (!apiKey && process.env.OPENAI_API_KEY) {
        apiKey = process.env.OPENAI_API_KEY;
      }
      if (!apiKey) {
        throw new Error(
          "Chave de API da OpenAI não configurada. Configure a API key no painel de configurações para utilizar este provedor."
        );
      }
    }

    if (!baseUrl) {
      throw new Error(`A URL base do provedor ${provider.name} não está configurada.`);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    if (provider.name === "openrouter") {
      headers["HTTP-Referer"] = "https://estudeai.local";
      headers["X-Title"] = "EstudeAI";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

    let rawBody = "";
    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: QUIZ_SYSTEM_PROMPT },
            { role: "user", content: promptUser },
          ],
          temperature: 0.2,
          stream: false,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      rawBody = await res.text();

      if (!res.ok) {
        throw new Error(
          `Falha do provedor ${provider.name} (HTTP ${res.status}): ${rawBody.slice(0, 300)}`
        );
      }
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Tempo limite esgotado ao aguardar resposta do provedor ${provider.name}.`);
      }
      throw err;
    }

    const { text: parsedContent } = extractContentFromRawBody(rawBody);
    return parseAndValidateQuizGeneration(parsedContent, availablePages);
  }

  // 3. Google Gemini
  if (provider.name === "gemini") {
    const creds = AISettingsStore.getProviderCredentials("gemini");
    const model = creds.model || "gemini-1.5-flash";
    const apiKey = creds.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Chave de API do Google Gemini não configurada.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let jsonText = "";
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: QUIZ_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: promptUser }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(`Erro do Gemini (HTTP ${res.status}): ${JSON.stringify(data)}`);
      }

      jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) {
        throw new Error("Resposta vazia retornada pelo Google Gemini.");
      }
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Tempo limite esgotado ao conectar com o Google Gemini.");
      }
      throw err;
    }

    return parseAndValidateQuizGeneration(jsonText, availablePages);
  }

  // 4. Ollama Local
  if (provider.name === "ollama") {
    const creds = AISettingsStore.getProviderCredentials("ollama");
    const baseUrl = (creds.baseUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
    const model = creds.model || "llama3.2-vision";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let textOutput = "";
    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: QUIZ_SYSTEM_PROMPT },
            { role: "user", content: promptUser },
          ],
          format: "json",
          stream: false,
          options: { temperature: 0.2 },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama retornou erro HTTP ${res.status}: ${errText}`);
      }

      const jsonResp = await res.json();
      textOutput = jsonResp?.message?.content || "";
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Tempo limite esgotado ao aguardar o Ollama local.");
      }
      throw err;
    }

    return parseAndValidateQuizGeneration(textOutput, availablePages);
  }

  throw new Error(`Provedor de IA desconhecido ou não suportado: ${provider.name}`);
}
