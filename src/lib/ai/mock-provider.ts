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
import { PageAnalysisSchema } from "./schema";

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
    const hasData = Boolean(
      (input.imageBase64 && input.imageBase64.trim().length > 0) ||
      (input.imageBuffer && input.imageBuffer.length > 0)
    );
    if (!hasData) {
      throw new Error(`Dados de imagem ausentes ou corrompidos para a página ${input.pageNumber}.`);
    }

    // Simulação com pequeno atraso natural de processamento de imagem (~400ms)
    await new Promise((r) => setTimeout(r, 400));

    const analysis = {
      pageNumber: input.pageNumber,
      title: `Capítulo ${input.pageNumber}: Leitura e Fundamentos`,
      extractedText: `1. PRINCÍPIOS FUNDAMENTAIS - PÁGINA ${input.pageNumber}

Nesta página ${input.pageNumber}, são apresentados os conceitos centrais do conteúdo do livro físico. O texto aborda os fundamentos teóricos com definições claras, termos técnicos e relações de causa e efeito essenciais para a compreensão do assunto.

Tópicos abordados:
- Definição estruturada dos conceitos principais;
- Relação entre teoria e prática no contexto do capítulo;
- Exemplos práticos para fixação e revisão.

Conclusão da página:
Os elementos discutidos preparam a base para o aprofundamento das próximas etapas do material de estudo.`,
      sections: [
        {
          title: "1. Introdução Teórica",
          content: `Apresentação dos princípios fundamentais da página ${input.pageNumber}.`,
        },
        {
          title: "2. Aplicação e Exemplos",
          content: "Contextualização dos conceitos essenciais e termos técnicos.",
        },
      ],
      summary: `Síntese da página ${input.pageNumber}: conceitos estruturados, definições essenciais e exemplos didáticos extraídos da página.`,
      importantConcepts: [
        "Fundamentação teórica",
        "Termos técnicos essenciais",
        "Leitura contextualizada",
        `Conceito-Chave ${input.pageNumber}`,
      ],
      formulasOrTables: [],
      confidence: 0.96,
    };

    return PageAnalysisSchema.parse(analysis);
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
        script: `Olá! Hoje vamos estudar ${title}. Este material aborda os conceitos essenciais extraídos diretamente do seu livro físico.`,
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
      ],
      processedAt: new Date().toISOString(),
    };
  }

  public async generateQuiz(studyAnalysis: import("./schema").StudyAnalysis): Promise<import("../quiz/schema").QuizGenerationServer> {
    const { generateMockQuizFromStudy } = await import("../quiz/quiz-generator");
    return generateMockQuizFromStudy(studyAnalysis);
  }
}
