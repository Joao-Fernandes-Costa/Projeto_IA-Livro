import { z } from "zod";

export const PageSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const PageAnalysisSchema = z.object({
  pageNumber: z.number().int().positive(),
  extractedText: z.string(),
  title: z.string().nullable(),
  sections: z.array(PageSectionSchema),
  summary: z.string(),
  importantConcepts: z.array(z.string()),
  formulasOrTables: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type PageSection = z.infer<typeof PageSectionSchema>;
export type PageAnalysis = z.infer<typeof PageAnalysisSchema>;

export interface PageProcessingError {
  pageNumber: number;
  code: string;
  message: string;
}

export interface StudyAnalysis {
  totalPages: number;
  processedPages: number;
  failedPages: number;
  fullText: string;
  pageAnalyses: PageAnalysis[];
  importantConcepts: string[];
  summaries: string[];
  averageConfidence: number;
  errors: PageProcessingError[];
}

export const MULTIMODAL_PAGE_READING_PROMPT = `Você é um sistema de leitura educacional.

Analise cuidadosamente a página enviada e extraia somente informações realmente visíveis na imagem.

Preserve:
- título;
- subtítulos;
- parágrafos;
- listas;
- comandos;
- exemplos;
- tabelas;
- fórmulas;
- conceitos técnicos.

Organize o resultado estritamente conforme o schema JSON abaixo:
{
  "pageNumber": number,
  "title": string ou null,
  "extractedText": string (transcrição fiel e completa de todo o texto legível da página),
  "sections": [
    { "title": string, "content": string }
  ],
  "summary": string (síntese didática do conteúdo da página),
  "importantConcepts": [string],
  "formulasOrTables": [string],
  "confidence": number entre 0.0 e 1.0 (nível de confiança na legibilidade e extração da página)
}

Regras obrigatórias:
- Não invente conteúdo.
- Não complete trechos ilegíveis.
- Se algum conteúdo não estiver presente na página, use "" para texto, [] para listas ou null para título.
- Se houver dúvida ou a imagem estiver borrada/escura, reduza o nível de confiança.
- Responda exclusivamente com o objeto JSON válido, sem texto explicativo adicional antes ou depois.
- Utilize português do Brasil.`;

/**
 * Função utilitária para extrair e validar JSON retornado pelos modelos de IA
 */
export function parseAndValidatePageAnalysis(
  rawOutput: string,
  expectedPageNumber: number
): PageAnalysis {
  let cleaned = rawOutput.trim();

  // Remove markdown code fences se presentes (```json ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  // Tenta encontrar o bloco JSON principal caso haja texto em volta
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  let parsedObj: Record<string, unknown>;
  try {
    parsedObj = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `O modelo não retornou um JSON válido. Resposta recebida: ${rawOutput.slice(0, 200)}...`
    );
  }

  // Normalização e sanitização segura de campos antes do Zod
  const normalized = {
    pageNumber:
      typeof parsedObj.pageNumber === "number" && parsedObj.pageNumber > 0
        ? parsedObj.pageNumber
        : expectedPageNumber,
    extractedText:
      typeof parsedObj.extractedText === "string" ? parsedObj.extractedText : "",
    title:
      typeof parsedObj.title === "string" && parsedObj.title.trim()
        ? parsedObj.title.trim()
        : null,
    sections: Array.isArray(parsedObj.sections)
      ? parsedObj.sections
          .filter(
            (s): s is { title?: unknown; content?: unknown } =>
              s !== null && typeof s === "object"
          )
          .map((s) => ({
            title: String(s.title || "Tópico"),
            content: String(s.content || ""),
          }))
      : [],
    summary: typeof parsedObj.summary === "string" ? parsedObj.summary : "",
    importantConcepts: Array.isArray(parsedObj.importantConcepts)
      ? parsedObj.importantConcepts.map((c) => String(c).trim()).filter(Boolean)
      : [],
    formulasOrTables: Array.isArray(parsedObj.formulasOrTables)
      ? parsedObj.formulasOrTables.map((f) => String(f).trim()).filter(Boolean)
      : [],
    confidence:
      typeof parsedObj.confidence === "number"
        ? Math.min(1, Math.max(0, parsedObj.confidence))
        : 0.85,
  };

  return PageAnalysisSchema.parse(normalized);
}

/**
 * Consolidador dos resultados de leitura das páginas
 */
export function consolidateStudyResults(
  totalPages: number,
  pageAnalyses: PageAnalysis[],
  errors: PageProcessingError[]
): StudyAnalysis {
  // Ordenar as páginas processadas sequencialmente
  const sorted = [...pageAnalyses].sort((a, b) => a.pageNumber - b.pageNumber);

  // Concatenar texto extraído com divisores claros
  const fullText = sorted
    .map((p) => `--- Página ${p.pageNumber} ---\n\n${p.extractedText.trim()}`)
    .join("\n\n\n");

  // Reunir resumos de cada página
  const summaries = sorted
    .map((p) => p.summary.trim())
    .filter((s) => s.length > 0);

  // Reunir conceitos importantes sem duplicações (case-insensitive)
  const conceptsSet = new Set<string>();
  const conceptsList: string[] = [];

  for (const page of sorted) {
    for (const concept of page.importantConcepts) {
      const lower = concept.toLowerCase();
      if (!conceptsSet.has(lower)) {
        conceptsSet.add(lower);
        conceptsList.push(concept);
      }
    }
  }

  // Calcular confiança média
  const averageConfidence =
    sorted.length > 0
      ? Number(
          (
            sorted.reduce((acc, p) => acc + p.confidence, 0) / sorted.length
          ).toFixed(2)
        )
      : 0;

  return {
    totalPages,
    processedPages: sorted.length,
    failedPages: errors.length,
    fullText,
    pageAnalyses: sorted,
    importantConcepts: conceptsList,
    summaries,
    averageConfidence,
    errors,
  };
}
