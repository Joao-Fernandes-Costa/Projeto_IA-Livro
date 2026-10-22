import { NextRequest, NextResponse } from "next/server";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import {
  PageAnalysis,
  PageProcessingError,
  consolidateStudyResults,
  PageAnalysisSchema,
} from "@/lib/ai/schema";
import { AnalyzePageInput } from "@/types/ai";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";

interface IncomingPagePayload {
  pageNumber: number;
  fileName: string;
  mimeType?: string;
  rotation?: number;
  imageBase64?: string;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const pagesToProcess: Array<IncomingPagePayload & { imageBuffer?: Buffer }> = [];

    // 1. Receber dados via multipart/form-data ou JSON
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const metadataStr = formData.get("metadata") as string | null;
      const metadata = metadataStr ? JSON.parse(metadataStr) : [];

      let idx = 0;
      while (formData.has(`file_${idx}`)) {
        const file = formData.get(`file_${idx}`) as File;
        const meta = metadata[idx] || {};
        const pageNumber = meta.pageNumber || idx + 1;
        const rotation = meta.rotation || 0;

        if (file && file.size <= MAX_FILE_SIZE_BYTES) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          pagesToProcess.push({
            pageNumber,
            fileName: file.name || `pagina-${pageNumber}.jpg`,
            mimeType: file.type || "image/jpeg",
            rotation,
            imageBuffer: buffer,
            imageBase64: buffer.toString("base64"),
          });
        }
        idx++;
      }
    } else {
      const body = await request.json().catch(() => null);
      if (!body || !Array.isArray(body.pages) || body.pages.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "NO_PAGES_PROVIDED",
              message: "Nenhuma página foi fornecida para processamento do estudo.",
            },
          },
          { status: 400 }
        );
      }

      for (const p of body.pages) {
        pagesToProcess.push({
          pageNumber: Number(p.pageNumber) || 1,
          fileName: p.fileName || `pagina-${p.pageNumber}.jpg`,
          mimeType: p.mimeType || "image/jpeg",
          rotation: p.rotation || 0,
          imageBase64: p.imageBase64 || "",
        });
      }
    }

    if (pagesToProcess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_VALID_PAGES",
            message: "Nenhuma página válida encontrada para leitura.",
          },
        },
        { status: 400 }
      );
    }

    // Ordenar páginas pelo número para garantir ordem sequencial estrita
    pagesToProcess.sort((a, b) => a.pageNumber - b.pageNumber);

    // 2. Obter provedor ativo pela fábrica central
    const provider = AIProviderFactory.getProvider();

    // 3. Checagem prévia de saúde e suporte a visão
    const health = await provider.checkHealth();
    if (!health.supportsVision) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VISION_NOT_SUPPORTED",
            message: "O modelo selecionado não possui suporte para leitura de imagens.",
          },
        },
        { status: 422 }
      );
    }

    if (!health.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROVIDER_UNAVAILABLE",
            message: `O provedor ${provider.name} está indisponível: ${health.message}`,
          },
        },
        { status: 503 }
      );
    }

    const totalPages = pagesToProcess.length;
    const results: PageAnalysis[] = [];
    const errors: PageProcessingError[] = [];

    // 4. Processamento obrigatoriamente SEQUENCIAL (uma página por vez)
    for (const pageItem of pagesToProcess) {
      let pageAnalysisResult: PageAnalysis | null = null;
      let lastError: Error | null = null;

      // Política de até 2 tentativas por página com pausa curta
      const MAX_ATTEMPTS = 2;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const input: AnalyzePageInput = {
            pageNumber: pageItem.pageNumber,
            imageBase64: pageItem.imageBase64,
            imageBuffer: pageItem.imageBuffer,
            mimeType: pageItem.mimeType,
            fileName: pageItem.fileName,
          };

          const rawAnalysis = await provider.analyzePage(input);
          pageAnalysisResult = PageAnalysisSchema.parse(rawAnalysis);
          break; // Sucesso, sai do loop de tentativas
        } catch (err: unknown) {
          lastError = err instanceof Error ? err : new Error(String(err));
          // Se for erro de visão não suportada, não adianta tentar novamente
          const errCode = (lastError as unknown as { code?: string }).code;
          if (errCode === "VISION_NOT_SUPPORTED") {
            break;
          }

          if (attempt < MAX_ATTEMPTS) {
            // Pausa curta de 600ms antes da segunda tentativa
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      }

      if (pageAnalysisResult) {
        results.push(pageAnalysisResult);
      } else {
        // Registra erro da página sem interromper o lote das demais páginas
        const code = (lastError as unknown as { code?: string })?.code || "PAGE_READ_FAILED";
        const message = lastError?.message || `Falha ao processar página ${pageItem.pageNumber}`;
        errors.push({
          pageNumber: pageItem.pageNumber,
          code,
          message,
        });
      }
    }

    // 5. Consolidar estudo completo
    const consolidated = consolidateStudyResults(totalPages, results, errors);

    return NextResponse.json({
      success: true,
      status: "completed",
      provider: provider.name,
      model: health.model,
      totalPages,
      processedPages: results.length,
      failedPages: errors.length,
      averageConfidence: consolidated.averageConfidence,
      results,
      errors,
      consolidation: consolidated,
    });
  } catch (error) {
    console.error("[Process Study Error] Falha inesperada durante lote sequencial:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "STUDY_PROCESS_ERROR",
          message: error instanceof Error ? error.message : "Erro interno ao processar estudo.",
        },
      },
      { status: 500 }
    );
  }
}
