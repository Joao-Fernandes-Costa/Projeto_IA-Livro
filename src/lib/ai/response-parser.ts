import { PageAnalysis } from "@/types/ai";
import { parseAndValidatePageAnalysis } from "./schema";

export type ResponseMode = "json" | "sse" | "direct-json";

export interface SafeLogMeta {
  provider: string;
  model: string;
  status: number;
  contentType: string;
  responseTimeMs: number;
  detectedMode: ResponseMode;
}

/**
 * Remove cercas Markdown como ```json e ``` de blocos de resposta.
 */
export function stripMarkdownFences(rawText: string): string {
  let cleaned = rawText.trim();

  // Remove ```json ... ``` ou ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // Tenta isolar o bloco JSON principal ({ ... }) caso haja texto ao redor
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

/**
 * Faz o parsing de respostas no formato SSE (Server-Sent Events / streaming).
 * Suporta fragmentos OpenAI-compatible iniciados com "data:".
 * Ignora linhas vazias e "data: [DONE]".
 * Extrai texto de:
 * - choices[0].delta.content
 * - choices[0].message.content
 * - choices[0].text
 */
export function parseSSEResponse(rawBody: string): string {
  const lines = rawBody.split(/\r?\n/);
  let accumulatedText = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.startsWith("data:")) {
      continue;
    }

    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]" || payload === '"[DONE]"') {
      continue;
    }

    try {
      const chunk = JSON.parse(payload);
      const choice = chunk.choices?.[0];
      if (!choice) continue;

      if (choice.delta?.content && typeof choice.delta.content === "string") {
        accumulatedText += choice.delta.content;
      } else if (choice.message?.content && typeof choice.message.content === "string") {
        accumulatedText += choice.message.content;
      } else if (choice.text && typeof choice.text === "string") {
        accumulatedText += choice.text;
      }
    } catch {
      // Ignora linhas com JSON parcial ou malformado em stream
    }
  }

  return accumulatedText;
}

/**
 * Faz o parsing de respostas no formato JSON tradicional.
 * Suporta:
 * - choices[0].message.content
 * - choices[0].text
 * - Objeto JSON estruturado retornado diretamente
 */
export function parseJSONResponse(rawBody: string): string {
  const cleaned = stripMarkdownFences(rawBody);
  const json = JSON.parse(cleaned);

  // Caso 1: choices[0].message.content
  if (json.choices?.[0]?.message?.content) {
    return String(json.choices[0].message.content);
  }

  // Caso 2: choices[0].text
  if (json.choices?.[0]?.text) {
    return String(json.choices[0].text);
  }

  // Caso 3: Resposta direta contendo a estrutura da página
  if (
    json.extractedText !== undefined ||
    json.pageNumber !== undefined ||
    json.sections !== undefined ||
    json.summary !== undefined
  ) {
    return JSON.stringify(json);
  }

  return JSON.stringify(json);
}

/**
 * Detecta o formato (JSON ou SSE) e extrai o texto consolidado.
 */
export function extractContentFromRawBody(
  rawBody: string,
  contentType: string = ""
): { text: string; mode: ResponseMode } {
  const trimmed = rawBody.trim();

  // Detecção de SSE: header de event-stream ou corpo iniciando com "data:"
  const isSSE =
    contentType.toLowerCase().includes("text/event-stream") ||
    trimmed.startsWith("data:") ||
    trimmed.includes("\ndata:");

  if (isSSE) {
    const sseText = parseSSEResponse(trimmed);
    if (sseText) {
      return { text: sseText, mode: "sse" };
    }
  }

  // Tentativa de parsing como JSON normal
  try {
    const jsonText = parseJSONResponse(trimmed);
    const mode: ResponseMode =
      trimmed.startsWith("{") && !trimmed.includes('"choices"')
        ? "direct-json"
        : "json";
    return { text: jsonText, mode };
  } catch {
    // Se falhou como JSON padrão mas tem "data:", tenta SSE
    if (trimmed.includes("data:")) {
      const sseText = parseSSEResponse(trimmed);
      if (sseText) {
        return { text: sseText, mode: "sse" };
      }
    }

    // Se nenhuma estrutura conhecida foi encontrada, repassa o texto limpo
    return { text: stripMarkdownFences(trimmed), mode: "json" };
  }
}

/**
 * Log seguro que NUNCA expõe API keys, conteúdo das páginas ou imagens.
 */
export function logSafeAIResponse(meta: SafeLogMeta): void {
  console.log(
    `[AI Response] provider=${meta.provider} model=${meta.model} status=${meta.status} contentType=${meta.contentType || "unknown"} time=${meta.responseTimeMs}ms mode=${meta.detectedMode}`
  );
}

export interface ParseResponseContext {
  provider: string;
  model: string;
  pageNumber: number;
  startTime: number;
}

/**
 * Lê a resposta HTTP completa como texto (sem usar response.json()),
 * faz a normalização (JSON normal ou SSE), remove cercas markdown,
 * registra logs seguros e valida com o PageAnalysisSchema (Zod).
 */
export async function parseOpenAICompatibleResponse(
  response: Response,
  ctx: ParseResponseContext
): Promise<PageAnalysis> {
  const contentType = response.headers.get("content-type") || "";
  const responseTimeMs = Date.now() - ctx.startTime;

  // LER O CORPO USANDO response.text()
  const rawBody = await response.text();

  if (!response.ok) {
    let errMessage = response.statusText;
    try {
      const errorJson = JSON.parse(stripMarkdownFences(rawBody));
      errMessage = errorJson?.error?.message || errMessage;
    } catch {
      errMessage = rawBody.slice(0, 150) || errMessage;
    }

    logSafeAIResponse({
      provider: ctx.provider,
      model: ctx.model,
      status: response.status,
      contentType,
      responseTimeMs,
      detectedMode: "json",
    });

    if (
      response.status === 400 &&
      (errMessage.toLowerCase().includes("image") ||
        errMessage.toLowerCase().includes("vision") ||
        errMessage.toLowerCase().includes("multimodal"))
    ) {
      const err = new Error("O modelo selecionado não possui suporte para leitura de imagens.");
      (err as unknown as { code: string }).code = "VISION_NOT_SUPPORTED";
      throw err;
    }

    if (response.status === 401) {
      const err = new Error(`Chave de autenticação recusada pelo provedor ${ctx.provider}.`);
      (err as unknown as { code: string }).code = "API_KEY_INVALID";
      throw err;
    }

    if (response.status === 429) {
      const err = new Error(`Limite de requisições excedido no provedor ${ctx.provider}.`);
      (err as unknown as { code: string }).code = "RATE_LIMIT_EXCEEDED";
      throw err;
    }

    throw new Error(`${ctx.provider} erro HTTP ${response.status}: ${errMessage}`);
  }

  // Extrai o conteúdo tratando tanto JSON normal quanto SSE
  const { text: extractedContent, mode } = extractContentFromRawBody(rawBody, contentType);

  logSafeAIResponse({
    provider: ctx.provider,
    model: ctx.model,
    status: response.status,
    contentType,
    responseTimeMs,
    detectedMode: mode,
  });

  if (!extractedContent || extractedContent.trim().length === 0) {
    throw new Error(`O modelo ${ctx.model} no provedor ${ctx.provider} retornou conteúdo vazio.`);
  }

  // Remove cercas Markdown e valida estruturadamente com Zod
  const cleanedJson = stripMarkdownFences(extractedContent);
  return parseAndValidatePageAnalysis(cleanedJson, ctx.pageNumber);
}
