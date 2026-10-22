import assert from "assert";
import {
  extractContentFromRawBody,
  parseSSEResponse,
  parseJSONResponse,
  stripMarkdownFences,
  parseOpenAICompatibleResponse,
} from "./response-parser";
import { parseAndValidatePageAnalysis } from "./schema";

async function runTests() {
  console.log("=== INICIANDO TESTES DO RESPONSE PARSER ===");
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // 1. Teste de resposta JSON normal
  test("1. Resposta JSON normal com choices[0].message.content", () => {
    const raw = JSON.stringify({
      id: "chatcmpl-123",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              pageNumber: 1,
              extractedText: "Texto extraído com sucesso da página 1.",
              title: "Introdução",
              sections: [{ title: "Seção 1", content: "Conteúdo" }],
              summary: "Resumo da página 1.",
              importantConcepts: ["Conceito A"],
              formulasOrTables: [],
              confidence: 0.98,
            }),
          },
        },
      ],
    });

    const { text, mode } = extractContentFromRawBody(raw, "application/json");
    assert.strictEqual(mode, "json");
    const validated = parseAndValidatePageAnalysis(text, 1);
    assert.strictEqual(validated.pageNumber, 1);
    assert.strictEqual(validated.extractedText, "Texto extraído com sucesso da página 1.");
    assert.strictEqual(validated.confidence, 0.98);
  });

  // 2. Teste de resposta SSE com múltiplos chunks
  test("2. Resposta SSE com múltiplos chunks (formato 9Router)", () => {
    const chunk1 = 'data: {"id":"chatcmpl-9r","choices":[{"index":0,"delta":{"content":"{\\n  \\"pageNumber\\": 1,\\n  \\"extractedText\\": \\"Fragmento 1 e "}}]}\n\n';
    const chunk2 = 'data: {"id":"chatcmpl-9r","choices":[{"index":0,"delta":{"content":"Fragmento 2\\",\\n  \\"title\\": \\"Capítulo 1\\",\\n  \\"sections\\": [],\\n  \\"summary\\": \\"Resumo dos fragmentos\\",\\n  \\"importantConcepts\\": [\\"Fragmento\\"],\\n  \\"formulasOrTables\\": [],\\n  \\"confidence\\": 0.92\\n}"}}]}\n\n';
    const chunk3 = "data: [DONE]\n\n";

    const sseBody = chunk1 + chunk2 + chunk3;

    const { text, mode } = extractContentFromRawBody(sseBody, "text/event-stream");
    assert.strictEqual(mode, "sse");
    assert(text.includes("Fragmento 1 e Fragmento 2"));

    const validated = parseAndValidatePageAnalysis(text, 1);
    assert.strictEqual(validated.pageNumber, 1);
    assert.strictEqual(validated.extractedText, "Fragmento 1 e Fragmento 2");
    assert.strictEqual(validated.title, "Capítulo 1");
    assert.strictEqual(validated.confidence, 0.92);
  });

  // 3. Teste de resposta SSE com [DONE]
  test("3. Resposta SSE ignora linhas vazias e [DONE] sem estourar SyntaxError", () => {
    const sseBody = `
: ping keepalive
data: {"choices":[{"delta":{"content":"{\\"pageNumber\\":2,\\"extractedText\\":\\"Página 2\\",\\"title\\":null,\\"sections\\":[],\\"summary\\":\\"Resumo 2\\",\\"importantConcepts\\":[],\\"formulasOrTables\\":[],\\"confidence\\":0.90}"}}]}

data: [DONE]
`;
    const text = parseSSEResponse(sseBody);
    assert.doesNotThrow(() => JSON.parse(text));
    const validated = parseAndValidatePageAnalysis(text, 2);
    assert.strictEqual(validated.pageNumber, 2);
    assert.strictEqual(validated.extractedText, "Página 2");
  });

  // 4. Teste de conteúdo retornado dentro de cercas Markdown ```json
  test("4. Conteúdo retornado dentro de ```json ... ```", () => {
    const fencedContent = `\`\`\`json
{
  "pageNumber": 3,
  "extractedText": "Texto transcrito dentro de bloco de código markdown.",
  "title": "Teorema Central",
  "sections": [{"title": "Demonstração", "content": "Passo a passo"}],
  "summary": "Resumo do teorema.",
  "importantConcepts": ["Teorema"],
  "formulasOrTables": ["a^2 + b^2 = c^2"],
  "confidence": 0.99
}
\`\`\``;

    const stripped = stripMarkdownFences(fencedContent);
    assert(!stripped.startsWith("```"));
    assert(!stripped.endsWith("```"));

    const validated = parseAndValidatePageAnalysis(fencedContent, 3);
    assert.strictEqual(validated.pageNumber, 3);
    assert.strictEqual(validated.title, "Teorema Central");
    assert.strictEqual(validated.formulasOrTables[0], "a^2 + b^2 = c^2");
  });

  // 5. Teste de resposta com cercas markdown dentro de SSE
  test("5. Resposta SSE transmitindo ```json progressivamente", () => {
    const sse = `data: {"choices":[{"delta":{"content":"\`\`\`json\\n{\\n"}}]}
data: {"choices":[{"delta":{"content":"  \\"pageNumber\\": 4,\\n  \\"extractedText\\": \\"Texto SSE com cercas\\",\\n"}}]}
data: {"choices":[{"delta":{"content":"  \\"title\\": null,\\n  \\"sections\\": [],\\n  \\"summary\\": \\"OK\\",\\n"}}]}
data: {"choices":[{"delta":{"content":"  \\"importantConcepts\\": [],\\n  \\"formulasOrTables\\": [],\\n  \\"confidence\\": 0.95\\n}\\n\`\`\`"}}]}
data: [DONE]
`;

    const { text, mode } = extractContentFromRawBody(sse);
    assert.strictEqual(mode, "sse");
    const validated = parseAndValidatePageAnalysis(text, 4);
    assert.strictEqual(validated.pageNumber, 4);
    assert.strictEqual(validated.extractedText, "Texto SSE com cercas");
  });

  // 6. Teste de resposta inválida
  test("6. Resposta inválida lança erro descritivo sem vazar dados", () => {
    const invalidText = "data: {\"choices\":[{\"delta\":{\"content\":\"Não foi possível ler esta página pois está totalmente borrada e não há texto compreensível.\"}}]}";
    const { text } = extractContentFromRawBody(invalidText);

    assert.throws(
      () => parseAndValidatePageAnalysis(text, 1),
      (err: Error) => {
        return err.message.includes("O modelo não retornou um JSON válido");
      }
    );
  });

  // 7. Teste de resposta direta contendo objeto JSON estruturado
  test("7. Resposta direta com o JSON da página no corpo", () => {
    const directJson = JSON.stringify({
      pageNumber: 5,
      extractedText: "Texto direto sem choices",
      title: null,
      sections: [],
      summary: "Resumo direto",
      importantConcepts: [],
      formulasOrTables: [],
      confidence: 0.88,
    });

    const { text, mode } = extractContentFromRawBody(directJson, "application/json");
    const validated = parseAndValidatePageAnalysis(text, 5);
    assert.strictEqual(validated.pageNumber, 5);
    assert.strictEqual(validated.extractedText, "Texto direto sem choices");
  });

  console.log(`\n=== RESULTADO: ${passed}/${total} TESTES PASSARAM COM SUCESSO! ===\n`);
}

runTests().catch((err) => {
  console.error("Falha fatal na suíte de testes:", err);
  process.exit(1);
});
