import { AIProvider } from "@/types/ai";
import { AIProviderFactory } from "../ai/provider-factory";
import { AISettingsStore } from "../ai/settings-store";
import { SecretStore } from "../security/secret-store";
import { extractContentFromRawBody } from "../ai/response-parser";
import { StudyAnalysis } from "../ai/schema";
import {
  formatStudyContentForPrompt,
  extractAvailablePageNumbers,
} from "../quiz/quiz-generator";
import {
  StudyMediaPackage,
  StudyMediaPackageSchema,
  AudiobookChapter,
  VideoScene,
  parseAndValidateStudyMedia,
} from "./schema";

export const LECTURE_MEDIA_SYSTEM_PROMPT = `Você é um professor carismático, didático e especialista em comunicação educacional do EstudeAI.
Sua missão é transformar o conteúdo extraído das páginas de um livro em dois formatos complementares e altamente envolventes:
1. Um AUDIOBOOK EXPLICATIVO (dividido em capítulos narrados como um podcast/aula fluida, natural para ser lida em voz alta por um sintetizador de voz sem símbolos estranhos).
2. Um VÍDEO EXPLICATIVO EM CENAS (dividido em cenas visuais dinâmicas, com tópicos curtos na tela, um destaque visual marcante e a fala sincronizada do professor).

DIRETRIZES OBRIGATÓRIAS:
1. FIDELIDADE: Baseie-se estritamente no conteúdo real das páginas fornecidas. Não invente dados fora do texto, mas use analogias claras para explicar os conceitos presentes nas páginas.
2. TEXTO DE NARRAÇÃO (narrationText): Escreva exatamente como um professor falaria em português do Brasil natural. Evite colchetes, markdown (*, #) ou abreviações difíceis de pronunciar dentro de "narrationText".
3. AUDIOBOOK (audiobookChapters): Crie entre 2 e 6 capítulos cobrindo toda a matéria enviada em sequência lógica. Cada capítulo deve ter uma narração rica e explicativa (4 a 7 frases bem desenvolvidas).
4. VÍDEO EXPLICATIVO (videoScenes): Crie entre 4 e 8 cenas curtas e dinâmicas (estilo vídeo educativo moderno). Cada cena deve ter:
   - "title": Título curto e impactante;
   - "subtitle": Subtítulo contextualizando o tópico;
   - "narrationText": A explicação falada daquela cena (2 a 4 frases claras);
   - "bulletPoints": 2 a 4 frases curtas que aparecem na tela enquanto o professor fala;
   - "visualHighlight": Um quadro de destaque ("concept", "formula", "quote" ou "summary") com "label" e "content";
   - "sourcePage": Número inteiro da página do livro de onde veio aquele conteúdo.
5. FORMATO: Responda EXCLUSIVAMENTE com um objeto JSON válido, sem markdown ou texto fora do JSON.

Formato JSON esperado:
{
  "title": "Aula & Audiobook: [Tema Principal do Material]",
  "overview": "Resumo geral do que você vai aprender neste audiobook e vídeo explicativo...",
  "audiobookChapters": [
    {
      "id": "chap-1",
      "chapterNumber": 1,
      "title": "Introdução e Conceitos Fundamentais",
      "narrationText": "Olá! Bem-vindo ao nosso estudo guiado. Neste primeiro capítulo, vamos entender de forma simples como funciona...",
      "keySummary": "Síntese de 1 linha sobre o que este capítulo explica.",
      "sourcePages": [1]
    }
  ],
  "videoScenes": [
    {
      "id": "scene-1",
      "sceneNumber": 1,
      "title": "O Conceito Central",
      "subtitle": "Fundamentos da Página 1",
      "narrationText": "Para começar nossa aula visual, repare na ideia principal apresentada logo no início do texto...",
      "bulletPoints": [
        "Primeiro ponto essencial explicado de forma direta",
        "Relação prática entre os elementos apresentados",
        "Impacto direto na compreensão do capítulo"
      ],
      "visualHighlight": {
        "type": "concept",
        "label": "Conceito-Chave",
        "content": "Definição curta ou fórmula central destacada no quadro."
      },
      "sourcePage": 1
    }
  ]
}`;

/**
 * Gera um pacote completo de Audiobook + Vídeo Explicativo a partir dos dados reais
 * do studyAnalysis quando o provedor Mock estiver selecionado.
 */
export function generateMockMediaFromStudy(
  studyAnalysis: StudyAnalysis
): StudyMediaPackage {
  const availablePages = extractAvailablePageNumbers(studyAnalysis);
  const pages =
    studyAnalysis.pageAnalyses && studyAnalysis.pageAnalyses.length > 0
      ? studyAnalysis.pageAnalyses
      : [
          {
            pageNumber: 1,
            title: "Fundamentos do Material Estudado",
            extractedText:
              studyAnalysis.fullText ||
              "Conteúdo introdutório extraído das páginas do livro.",
            sections: [
              {
                title: "Visão Geral",
                content: "Explicação inicial sobre os tópicos abordados.",
              },
            ],
            summary:
              studyAnalysis.summaries?.[0] ||
              "Síntese didática dos conceitos apresentados na página.",
            importantConcepts: studyAnalysis.importantConcepts || [
              "Conceito Central",
              "Aplicação Prática",
            ],
            formulasOrTables: [],
            confidence: 0.95,
          },
        ];

  const mainTitle =
    pages[0]?.title || "Estudo Guiado das Páginas Selecionadas";

  const audiobookChapters: AudiobookChapter[] = pages.map((page, idx) => {
    const conceptsText =
      page.importantConcepts.length > 0
        ? `Os conceitos mais importantes aqui são: ${page.importantConcepts.join(", ")}.`
        : "";

    const sectionIntro =
      page.sections.length > 0
        ? `O autor divide essa parte abordando ${page.sections
            .map((s) => s.title)
            .join(" e ")}.`
        : "";

    return {
      id: `chap-${idx + 1}`,
      chapterNumber: idx + 1,
      title: page.title
        ? `Capítulo ${idx + 1}: ${page.title}`
        : `Capítulo ${idx + 1}: Análise da Página ${page.pageNumber}`,
      narrationText: `${
        idx === 0
          ? "Olá! Seja muito bem-vindo ao seu audiobook personalizado de estudos. "
          : ""
      }Agora vamos explorar o conteúdo da página ${page.pageNumber}${
        page.title ? `, que trata sobre ${page.title}` : ""
      }. ${page.summary} ${sectionIntro} ${conceptsText} Preste bastante atenção em como essas ideias se conectam para facilitar sua revisão e preparar você para o questionário final.`,
      keySummary:
        page.summary ||
        `Explicação detalhada dos conceitos da página ${page.pageNumber}.`,
      sourcePages: [page.pageNumber || availablePages[0] || 1],
    };
  });

  const videoScenes: VideoScene[] = [];
  let sceneCounter = 1;

  for (const page of pages) {
    const pageNum = page.pageNumber || 1;
    const bullets = [
      page.summary
        ? page.summary.slice(0, 110) + (page.summary.length > 110 ? "..." : "")
        : "Compreensão estruturada do tema principal da página.",
      ...page.importantConcepts.slice(0, 2).map((c) => `Foco essencial: ${c}`),
    ];

    videoScenes.push({
      id: `scene-${sceneCounter}`,
      sceneNumber: sceneCounter,
      title: page.title || `Síntese Visual • Página ${pageNum}`,
      subtitle: `Conceitos fundamentais da página ${pageNum}`,
      narrationText: `Olhando para a página ${pageNum} do nosso livro, o ponto central que você precisa dominar é o seguinte: ${page.summary}`,
      bulletPoints: bullets.slice(0, 4),
      visualHighlight: {
        type: page.formulasOrTables.length > 0 ? "formula" : "concept",
        label:
          page.formulasOrTables.length > 0
            ? "Fórmula / Tabela Destacada"
            : "Conceito-Chave da Página",
        content:
          page.formulasOrTables[0] ||
          page.importantConcepts[0] ||
          page.title ||
          "Ideia central para fixação rápida.",
      },
      sourcePage: pageNum,
    });
    sceneCounter++;

    if (page.sections && page.sections.length > 0) {
      const firstSec = page.sections[0];
      videoScenes.push({
        id: `scene-${sceneCounter}`,
        sceneNumber: sceneCounter,
        title: firstSec.title || `Aprofundamento • Página ${pageNum}`,
        subtitle: `Detalhamento passo a passo (Página ${pageNum})`,
        narrationText: `Aprofundando no tópico ${firstSec.title}: ${firstSec.content}`,
        bulletPoints: [
          firstSec.content.slice(0, 120) +
            (firstSec.content.length > 120 ? "..." : ""),
          ...(page.importantConcepts.slice(1, 3).map((c) => `Relação com: ${c}`)),
        ].slice(0, 4),
        visualHighlight: {
          type: "summary",
          label: "Para Lembrar na Prova",
          content:
            page.importantConcepts.join(" • ") ||
            firstSec.title ||
            "Resumo aplicado do tópico.",
        },
        sourcePage: pageNum,
      });
      sceneCounter++;
    }
  }

  return StudyMediaPackageSchema.parse({
    title: `Aula & Audiobook: ${mainTitle}`,
    overview: `Explicação completa em áudio e vídeo gerada a partir de ${pages.length} página(s) do seu material de estudo.`,
    audiobookChapters,
    videoScenes,
  });
}

/**
 * Gera o pacote de Audiobook e Vídeo Explicativo usando o provedor de IA ativo.
 */
export async function generateStudyMediaFromStudy(
  studyAnalysis: StudyAnalysis,
  providerInstance?: AIProvider
): Promise<StudyMediaPackage> {
  const provider = providerInstance || AIProviderFactory.getProvider();
  const availablePages = extractAvailablePageNumbers(studyAnalysis);
  const textContent = formatStudyContentForPrompt(studyAnalysis);

  if (!textContent || textContent.trim().length === 0) {
    throw new Error(
      "Nenhum conteúdo legível encontrado nas páginas analisadas para gerar o audiobook e o vídeo."
    );
  }

  if (provider.name === "mock") {
    return generateMockMediaFromStudy(studyAnalysis);
  }

  const promptUser = `Abaixo está o conteúdo extraído das páginas do livro do estudante.
Crie o pacote completo contendo os capítulos do Audiobook Explicativo (audiobookChapters) e as cenas do Vídeo Explicativo (videoScenes) baseando-se exclusivamente neste material.

CONTEÚDO EXTRAÍDO DO LIVRO:
${textContent}

Retorne APENAS o objeto JSON válido conforme o formato especificado.`;

  // 1. Provedores OpenAI-compatible (OpenRouter, Custom/9Router, OpenAI)
  if (
    provider.name === "openrouter" ||
    provider.name === "custom" ||
    provider.name === "openai"
  ) {
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
    } else if (provider.name === "openai") {
      baseUrl = baseUrl || "https://api.openai.com/v1";
      model = model || "gpt-4o-mini";
      if (!apiKey && process.env.OPENAI_API_KEY) {
        apiKey = process.env.OPENAI_API_KEY;
      }
    }

    if (!baseUrl) {
      throw new Error(
        `A URL base do provedor ${provider.name} não está configurada.`
      );
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
    const timeout = setTimeout(() => controller.abort(), 75000);

    let rawBody = "";
    try {
      const res = await fetch(
        `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: LECTURE_MEDIA_SYSTEM_PROMPT },
              { role: "user", content: promptUser },
            ],
            temperature: 0.3,
            stream: false,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        }
      );

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
        throw new Error(
          `Tempo limite esgotado ao gerar o roteiro de áudio e vídeo com ${provider.name}.`
        );
      }
      throw err;
    }

    const { text: parsedContent } = extractContentFromRawBody(rawBody);
    return parseAndValidateStudyMedia(parsedContent, availablePages);
  }

  // 2. Google Gemini
  if (provider.name === "gemini") {
    const creds = AISettingsStore.getProviderCredentials("gemini");
    const model = creds.model || "gemini-1.5-flash";
    const apiKey = creds.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Chave de API do Google Gemini não configurada.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75000);

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
            parts: [{ text: LECTURE_MEDIA_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: promptUser }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          `Erro do Gemini (HTTP ${res.status}): ${JSON.stringify(data)}`
        );
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

    return parseAndValidateStudyMedia(jsonText, availablePages);
  }

  // 3. Ollama Local
  if (provider.name === "ollama") {
    const creds = AISettingsStore.getProviderCredentials("ollama");
    const baseUrl = (creds.baseUrl || "http://127.0.0.1:11434").replace(
      /\/+$/,
      ""
    );
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
            { role: "system", content: LECTURE_MEDIA_SYSTEM_PROMPT },
            { role: "user", content: promptUser },
          ],
          format: "json",
          stream: false,
          options: { temperature: 0.3 },
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

    return parseAndValidateStudyMedia(textOutput, availablePages);
  }

  throw new Error(`Provedor de IA não suportado: ${provider.name}`);
}
