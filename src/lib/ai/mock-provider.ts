import {
  AIProvider,
  AIProviderName,
  AIHealthResult,
  AnalyzePageInput,
  AnalyzePageResult,
  IAIProvider,
  AIAnalysisRequest,
} from "@/types/ai";
import { AIStudyResult } from "@/types/study";

export class MockAIProvider implements AIProvider, IAIProvider {
  public readonly name: AIProviderName = "mock";
  public readonly providerName: string = "mock";
  private model: string;

  constructor(model: string = "mock-vision-v1") {
    this.model = model;
  }

  public async checkHealth(): Promise<AIHealthResult> {
    return {
      success: true,
      provider: "mock",
      model: this.model,
      supportsVision: true,
      supportsStructuredOutput: true,
      message: "Provider Mock disponível. Ambiente de simulação operacional para desenvolvimento e testes locais.",
    };
  }

  public async analyzePage(input: AnalyzePageInput): Promise<AnalyzePageResult> {
    return {
      pageNumber: input.pageNumber,
      extractedText: `[Texto Simulado da Página ${input.pageNumber}] Conteúdo didático extraído com fidelidade a partir do material de estudo.`,
      summary: `Resumo simulado dos conceitos e fundamentos apresentados na página ${input.pageNumber}.`,
      keyPoints: [
        `Ponto essencial ${input.pageNumber}.1: Fundamentos teóricos e conceitos principais.`,
        `Ponto essencial ${input.pageNumber}.2: Aplicações práticas e conexões interdisciplinares.`,
        `Ponto essencial ${input.pageNumber}.3: Exemplos contextualizados para fixação.`,
      ],
    };
  }

  public async analyzePages(request: AIAnalysisRequest): Promise<AIStudyResult> {
    const pageCount = request.pages.length;
    const title = request.title || "Material de Estudo";

    return {
      studyTitle: title,
      pageCount,
      extractedMarkdown: `# ${title}\n\nEste é um resumo gerado pelo MockProvider a partir de ${pageCount} páginas de livro enviadas.\n\n## Principais Conceitos\n- Fundamento 1: Estruturação clara das ideias\n- Fundamento 2: Exemplificação contextualizada\n- Fundamento 3: Roteiro didático de fixação`,
      lecture: {
        title: `Aula Didática: ${title}`,
        summary: `Visão geral estruturada sobre ${title}, cobrindo os pontos essenciais das ${pageCount} páginas fornecidas.`,
        script: `Olá! Hoje vamos estudar ${title}. Este material aborda os conceitos essenciais extraídos diretamente do seu livro físico. Vamos passar por cada etapa de forma clara e objetiva.`,
        slides: request.pages.map((p, idx) => ({
          pageNumber: idx + 1,
          title: `Tópico ${idx + 1}: ${p.name || `Página ${idx + 1}`}`,
          content: `Explicação detalhada dos pontos centrais abordados na página ${idx + 1} do seu material de estudo.`,
          keyPoints: [
            "Conceito fundamental abordado",
            "Exemplo prático de aplicação",
            "Dica de fixação para provas",
          ],
        })),
      },
      quiz: [
        {
          id: "q1",
          question: `Qual o principal conceito introduzido no material sobre "${title}"?`,
          options: [
            "A importância da fundamentação teórica e leitura contextualizada",
            "Apenas repetição mecânica de fórmulas",
            "Ignorar a sequência cronológica dos fatos",
            "Nenhuma das opções anteriores",
          ],
          answerIndex: 0,
          explanation: "O material enfatiza a construção sequencial do conhecimento com base nas páginas do livro.",
          pageReference: 1,
        },
        {
          id: "q2",
          question: "Como o conteúdo apresentado pode ser aplicado na prática?",
          options: [
            "Por meio de exercícios estruturados e resolução de problemas reais",
            "Apenas através de memorização passiva",
            "Sem qualquer aplicação no mundo real",
            "Exclusivamente por leitura rápida",
          ],
          answerIndex: 0,
          explanation: "A aplicação prática requer resolução ativa e conexão direta com os conceitos.",
          pageReference: Math.min(2, pageCount),
        },
      ],
      processedAt: new Date().toISOString(),
    };
  }
}
