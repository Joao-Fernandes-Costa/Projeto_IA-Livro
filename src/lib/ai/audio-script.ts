import { AIProvider } from "@/types/ai";
import { AIProviderFactory } from "./provider-factory";
import { AISettingsStore } from "./settings-store";
import { SecretStore } from "@/lib/security/secret-store";
import { extractContentFromRawBody, stripMarkdownFences } from "./response-parser";
import { StudyAnalysis } from "./schema";

export const AUDIO_SCRIPT_SYSTEM_PROMPT = `Você é um tutor pedagógico, professor e comunicador do EstudeAI.
Sua missão é transformar o material de estudo transcrito em um ROTEIRO DIDÁTICO FALADO (em português brasileiro) para ser gravado ou sintetizado em áudio para o estudante.

DIRETRIZES DE CONTEÚDO (RIGOROSAMENTE OBRIGATÓRIAS):
1. O roteiro DEVE ser baseado EXCLUSIVAMENTE nas informações reais das páginas do material de estudo fornecidas.
2. NUNCA invente conceitos, fórmulas ou dados que não estejam presentes no texto enviado.
3. ESTRUTURA OBRIGATÓRIA DA NARRAÇÃO:
   - Introdução: Abertura calorosa e acolhedora, apresentando o tema geral do estudo.
   - Conceitos Principais: Explicação clara, didática e acessível dos conceitos centrais das páginas.
   - Conexão entre as Páginas: Relação lógica de como o assunto evolui de uma página para a outra (ex: "Começamos na página 1 entendendo...", "Em seguida, aprofundamos na próxima página...").
   - Exemplos Práticos: Contextualização com os exemplos e aplicações citados no material original.
   - Conclusão: Uma síntese memorável dos pontos mais importantes para fixação do conteúdo.
   - Encerramento: Um convite caloroso para o aluno fixar o aprendizado respondendo às questões do Questionário Interativo do EstudeAI.

DIRETRIZES DE FORMATO PARA ÁUDIO:
- O texto gerado será falado em voz alta por um sintetizador de voz (TTS).
- NÃO use títulos markdown como "#", "##", nem negritos "**", nem marcadores de lista "-" ou tabelas.
- Escreva parágrafos fluidos, com pontuação adequada (vírgulas, pontos e exclamações suaves) para que o sintetizador faça pausas e entonação natural.
- TAMANHO: O roteiro deve ter entre 400 e 650 palavras (aproximadamente 3 a 5 minutos de narração em velocidade normal).
- Retorne APENAS o texto da fala contínua, sem metadados, sem rubricas de gravação como [Música] ou [Pausa].`;

/**
 * Calcula a estimativa de duração em segundos a partir do número de palavras.
 * Em média, fala natural em português do Brasil varia entre 130 e 150 palavras por minuto (~140 WPM).
 */
export function estimateAudioDuration(text: string): { durationSeconds: number; wordCount: number } {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const wordCount = words.length;
  // ~140 palavras por minuto => ~2.33 palavras por segundo
  const durationSeconds = Math.max(30, Math.round((wordCount / 140) * 60));
  return { durationSeconds, wordCount };
}

/**
 * Extrai e formata o conteúdo consolidado das páginas para o prompt da IA.
 */
function buildStudyContentText(studyAnalysis: StudyAnalysis): string {
  const parts: string[] = [];

  if (studyAnalysis.pageAnalyses && studyAnalysis.pageAnalyses.length > 0) {
    for (const page of studyAnalysis.pageAnalyses) {
      parts.push(`=== PÁGINA ${page.pageNumber} ${page.title ? `(${page.title})` : ""} ===`);
      if (page.summary) {
        parts.push(`Resumo da página: ${page.summary}`);
      }
      if (page.importantConcepts && page.importantConcepts.length > 0) {
        parts.push(`Conceitos importantes: ${page.importantConcepts.join(", ")}`);
      }
      if (page.sections && page.sections.length > 0) {
        for (const s of page.sections) {
          parts.push(`[${s.title}]\n${s.content}`);
        }
      }
      if (page.extractedText) {
        parts.push(`Texto transcrito:\n${page.extractedText}`);
      }
      parts.push("\n");
    }
  } else if (studyAnalysis.fullText) {
    parts.push(`Texto das páginas:\n${studyAnalysis.fullText}`);
  }

  return parts.join("\n");
}

/**
 * Gera um roteiro didático dinâmico baseado no conteúdo real das páginas para quando o MockProvider estiver ativo.
 */
export function generateMockAudioScriptFromStudy(studyAnalysis: StudyAnalysis): {
  script: string;
  durationEstimate: number;
  wordCount: number;
} {
  const pages = studyAnalysis.pageAnalyses || [];
  const totalPages = pages.length > 0 ? pages.length : 1;
  const firstTitle = pages[0]?.title || "Conteúdo do Livro";
  const allConcepts = Array.from(
    new Set([
      ...(studyAnalysis.importantConcepts || []),
      ...pages.flatMap((p) => p.importantConcepts || []),
      "fundamentação teórica",
      "compreensão estruturada",
    ])
  );

  const conceptsSummary = allConcepts.slice(0, 4).join(", ");

  let pageNarrations = "";
  if (pages.length > 0) {
    pageNarrations = pages
      .map((p) => {
        const pageConcepts = p.importantConcepts?.length ? p.importantConcepts.join(" e ") : "ideias fundamentais";
        return `Na página ${p.pageNumber}, o foco recai sobre ${p.title || `o conteúdo da página ${p.pageNumber}`}. Aqui, o material apresenta ${p.summary || "conceitos centrais indispensáveis"}, demonstrando a relevância de ${pageConcepts}.`;
      })
      .join(" ");
  } else {
    pageNarrations = `Ao longo das páginas estudadas, observamos uma construção lógica em torno de ${conceptsSummary}.`;
  }

  const script = `Olá! Seja muito bem-vindo ao EstudeAI. Hoje nós vamos mergulhar na explicação das páginas do seu material de estudo sobre ${firstTitle}.

Nosso objetivo neste áudio é organizar as ideias principais de maneira simples, conectando cada ponto do texto para que você compreenda e memorize com facilidade.

Para começar, o material destaca conceitos centrais como ${conceptsSummary}. Esses fundamentos funcionam como alicerces para todo o restante da matéria. Quando compreendemos esses princípios, tudo passa a fazer sentido de forma intuitiva.

${pageNarrations}

Observe como essas partes se conectam: o entendimento de cada página apoia a compreensão da seguinte, construindo um raciocínio coeso e completo. Quando você analisa os exemplos apresentados no livro, percebe como essa teoria se aplica na prática e nos exercícios.

Em conclusão, os tópicos que vimos hoje estruturam a base do seu aprendizado neste assunto. Lembre-se de revisar com atenção os pontos de ${conceptsSummary}.

Para coroar esse estudo e comprovar que o conteúdo está realmente fixado na sua mente, convido você agora a acessar a aba do Questionário Interativo aqui no EstudeAI. Teste seus conhecimentos respondendo às questões elaboradas a partir deste material. Bons estudos e até a próxima!`.trim();

  const { durationSeconds, wordCount } = estimateAudioDuration(script);
  return {
    script,
    durationEstimate: durationSeconds,
    wordCount,
  };
}

/**
 * Gera o roteiro de áudio didático utilizando a IA ativa no sistema,
 * baseando-se estritamente no conteúdo real do studyAnalysis.
 */
export async function generateAudioScript(
  studyAnalysis: StudyAnalysis,
  providerOverride?: AIProvider
): Promise<{
  script: string;
  durationEstimate: number;
  wordCount: number;
}> {
  const contentText = buildStudyContentText(studyAnalysis);
  if (!contentText || contentText.trim().length === 0) {
    throw new Error(
      "Nenhum conteúdo legível foi encontrado nas páginas. É necessário processar as páginas do livro antes de gerar a explicação em áudio."
    );
  }

  const provider = providerOverride || AIProviderFactory.getProvider();

  // 1. Provedor Mock explicitamente ativo
  if (provider.name === "mock") {
    return generateMockAudioScriptFromStudy(studyAnalysis);
  }

  const promptUser = `Abaixo está o conteúdo real extraído das páginas do material de estudo.
Crie um roteiro didático falado para narração em áudio, em português brasileiro, seguindo estritamente as diretrizes fornecidas.

CONTEÚDO DO MATERIAL ESTUDADO:
${contentText}

Lembre-se: Retorne APENAS o texto contínuo que o narrador irá falar em voz alta, sem marcadores de formatação markdown.`;

  // 2. Provedores compatíveis com OpenAI (OpenRouter, Custom/9Router, OpenAI)
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
    } else if (provider.name === "openai") {
      baseUrl = baseUrl || "https://api.openai.com/v1";
      model = model || "gpt-4o-mini";
      if (!apiKey && process.env.OPENAI_API_KEY) {
        apiKey = process.env.OPENAI_API_KEY;
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
    const timeout = setTimeout(() => controller.abort(), 60000);

    let rawBody = "";
    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: AUDIO_SCRIPT_SYSTEM_PROMPT },
            { role: "user", content: promptUser },
          ],
          temperature: 0.3,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      rawBody = await res.text();

      if (!res.ok) {
        throw new Error(
          `Falha do provedor ${provider.name} ao gerar áudio (HTTP ${res.status}): ${rawBody.slice(0, 300)}`
        );
      }
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Tempo limite esgotado ao aguardar o provedor ${provider.name}.`);
      }
      throw err;
    }

    const { text } = extractContentFromRawBody(rawBody);
    const cleanedScript = cleanSpokenScript(text);

    if (!cleanedScript || cleanedScript.length < 50) {
      throw new Error("O modelo de IA retornou um roteiro vazio ou incompleto para a explicação em áudio.");
    }

    const { durationSeconds, wordCount } = estimateAudioDuration(cleanedScript);
    return {
      script: cleanedScript,
      durationEstimate: durationSeconds,
      wordCount,
    };
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

    let textOutput = "";
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: AUDIO_SCRIPT_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: promptUser }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(`Erro do Gemini (HTTP ${res.status}): ${JSON.stringify(data)}`);
      }

      textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Tempo limite esgotado ao conectar com o Google Gemini.");
      }
      throw err;
    }

    const cleanedScript = cleanSpokenScript(textOutput);
    if (!cleanedScript || cleanedScript.length < 50) {
      throw new Error("O Google Gemini retornou um roteiro vazio para a explicação em áudio.");
    }

    const { durationSeconds, wordCount } = estimateAudioDuration(cleanedScript);
    return {
      script: cleanedScript,
      durationEstimate: durationSeconds,
      wordCount,
    };
  }

  // 4. Ollama
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
            { role: "system", content: AUDIO_SCRIPT_SYSTEM_PROMPT },
            { role: "user", content: promptUser },
          ],
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

    const cleanedScript = cleanSpokenScript(textOutput);
    if (!cleanedScript || cleanedScript.length < 50) {
      throw new Error("O Ollama retornou um roteiro vazio para a explicação em áudio.");
    }

    const { durationSeconds, wordCount } = estimateAudioDuration(cleanedScript);
    return {
      script: cleanedScript,
      durationEstimate: durationSeconds,
      wordCount,
    };
  }

  throw new Error(`Provedor de IA desconhecido: ${provider.name}`);
}

/**
 * Remove resíduos de formatação markdown para deixar o texto limpo e fluido para fala em áudio.
 */
function cleanSpokenScript(raw: string): string {
  let cleaned = stripMarkdownFences(raw).trim();

  // Se o modelo colocou aspas envolvendo todo o texto
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Remove títulos markdown como #, ##, ###
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // Remove negrito e itálico markdown (**texto** ou *texto*)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");

  // Remove marcadores de tópicos iniciais (- ou *)
  cleaned = cleaned.replace(/^\s*[-*]\s+/gm, "");

  // Normaliza múltiplos espaços e quebras excessivas
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}
