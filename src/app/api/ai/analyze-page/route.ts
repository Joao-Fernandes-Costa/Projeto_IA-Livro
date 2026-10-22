import { NextRequest, NextResponse } from "next/server";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { MAX_FILE_SIZE_BYTES, ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { PageAnalysisSchema, PageAnalysis } from "@/lib/ai/schema";
import { AnalyzePageInput } from "@/types/ai";

export async function POST(request: NextRequest) {
  try {
    let pageNumber = 1;
    let mimeType = "image/jpeg";
    let imageBuffer: Buffer | null = null;
    let imageBase64: string | null = null;
    let fileName = "pagina.jpg";

    const contentType = request.headers.get("content-type") || "";

    // 1. Processar requisição multipart/form-data ou application/json
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const pageNumStr = formData.get("pageNumber") as string | null;

      if (pageNumStr) {
        pageNumber = parseInt(pageNumStr, 10) || 1;
      }

      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MISSING_FILE",
              message: "Nenhum arquivo de imagem foi enviado no formulário.",
            },
          },
          { status: 400 }
        );
      }

      fileName = file.name || "pagina.jpg";
      mimeType = file.type || "image/jpeg";

      // Validar tamanho máximo (15 MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FILE_TOO_LARGE",
              message: "A imagem enviada excede o limite máximo permitido de 15 MB.",
            },
          },
          { status: 400 }
        );
      }

      // Validar MIME type
      if (!file.type.startsWith("image/") && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_MIME_TYPE",
              message: "Formato de arquivo inválido. Envie uma imagem JPG, PNG, WEBP ou HEIC.",
            },
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      imageBase64 = imageBuffer.toString("base64");
    } else {
      const jsonBody = await request.json().catch(() => null);
      if (!jsonBody) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "BAD_REQUEST",
              message: "Corpo da requisição inválido.",
            },
          },
          { status: 400 }
        );
      }

      pageNumber = Number(jsonBody.pageNumber) || 1;
      fileName = jsonBody.fileName || "pagina.jpg";
      mimeType = jsonBody.mimeType || "image/jpeg";
      imageBase64 = jsonBody.imageBase64 || null;

      if (!imageBase64) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MISSING_IMAGE_DATA",
              message: "Dados da imagem em base64 não foram informados.",
            },
          },
          { status: 400 }
        );
      }
    }

    // 2. Obter provider ativo obrigatoriamente através da AIProviderFactory
    const provider = AIProviderFactory.getProvider();

    // 3. Checagem de saúde e suporte real a visão
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

    // 4. Executar leitura da página com o modelo multimodal
    const input: AnalyzePageInput = {
      pageNumber,
      imageBase64: imageBase64 || undefined,
      imageBuffer: imageBuffer || undefined,
      mimeType,
      fileName,
    };

    const analysis: PageAnalysis = await provider.analyzePage(input);

    // 5. Validar com Zod
    const validated = PageAnalysisSchema.parse(analysis);

    return NextResponse.json({
      success: true,
      provider: provider.name,
      model: health.model,
      data: validated,
    });
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj.code || "ANALYSIS_ERROR";
    const message = errorObj.message || "Erro desconhecido ao processar a página.";

    let status = 500;
    if (code === "VISION_NOT_SUPPORTED") status = 422;
    if (code === "API_KEY_MISSING" || code === "API_KEY_INVALID") status = 401;
    if (code === "MODEL_TIMEOUT") status = 504;
    if (code === "RATE_LIMIT_EXCEEDED") status = 429;

    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
        },
      },
      { status }
    );
  }
}
