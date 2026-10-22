# 📚 EstudeAI — Leitor Inteligente de Livros com IA

O **EstudeAI** é uma plataforma de estudos assistida por Inteligência Artificial projetada para transformar páginas físicas de livros em uma experiência de aprendizado completa e interativa.

O objetivo do projeto é permitir que o estudante fotografe ou envie imagens das páginas de um livro que deseja estudar e, a partir desse conteúdo:
1. **Leitura Multimodal (Visão + OCR Inteligente):** A IA lê e interpreta as páginas fotografadas (textos, tabelas, gráficos e fórmulas).
2. **Explicação Didática (Áudio / Vídeo de Slides):** Geração de uma aula explicativa narrada sobre o conteúdo das páginas enviadas.
3. **Quiz de Fixação:** Geração automática de perguntas de múltipla escolha com correção comentada e referência à página original do livro para testar o aprendizado.

---

## 🧠 Capacidade e Arquitetura de IA Planejada

Durante o levantamento de viabilidade técnica do projeto, foram definidos os parâmetros de capacidade utilizando modelos gratuitos (como **Google Gemini Flash via Google AI Studio** e **Edge-TTS** para síntese de voz):

| Métrica | Estimativa / Capacidade |
| :--- | :--- |
| **Média por página de livro** | ~300 a 350 palavras (~450 a 500 tokens) |
| **Capacidade na memória (Gemini Free Tier)** | **1 Milhão de tokens** (~700.000 palavras ou **~1.800 páginas**) |
| **Envio recomendado por sessão de estudo** | 5 a 30 páginas (1 capítulo por vez para máxima profundidade didática) |
| **Geração de Voz (TTS)** | Vozes neurais gratuitas via `edge-tts` ou Web Speech / Cloud TTS |

---

## ✅ O que já foi feito (Etapa 1 — Protótipo Inicial)

A **Etapa 1** consiste na interface completa de **recebimento, inspeção e preparação das fotos das páginas do livro**:

- **Upload Flexível de Imagens:**
  - Suporte a *Drag & Drop* (arrastar e soltar várias páginas de uma só vez).
  - Seleção de múltiplos arquivos do computador ou celular (`JPG`, `PNG`, `WEBP`, `HEIC`).
  - Captura direta pela câmera do dispositivo móvel (`capture="environment"`).
  - Atalho rápido para colar imagens ou capturas de tela com `Ctrl + V`.
- **Organização e Ajuste das Páginas:**
  - Grade visual numerada sequencialmente (`Página 1`, `Página 2`, ...).
  - Reordenação das páginas arrastando os cartões (*Drag & Drop*) ou usando os botões de navegação (`←` / `→`).
  - Rotação individual de 90° para corrigir fotos tiradas na horizontal ou de cabeça para baixo.
  - Modal de **Zoom em Tela Cheia** para verificar a legibilidade do texto antes do envio.
  - Remoção individual de páginas ou limpeza completa do lote.
- **Medidor de Memória da IA em Tempo Real:**
  - Cálculo automático da quantidade de páginas, estimativa de palavras (~350/página), tokens (~500/página) e tamanho total em MB comparados com a capacidade do plano gratuito da IA.
- **Inicialização Rápida no Windows:**
  - Script automatizado [`iniciar.bat`](./iniciar.bat) que verifica/instala dependências, exibe os endereços de acesso na rede local (PC e Celular), abre o navegador e inicia o servidor.

---

## 🗺️ Próximas Etapas (Roadmap)

- [x] **Etapa 1:** Interface de captura, upload, ordenação, rotação e pré-visualização das páginas do livro.
- [ ] **Etapa 2:** Integração com a API gratuita do **Google Gemini Flash** para extração estruturada do texto das imagens (Markdown) e geração do resumo explicativo.
- [ ] **Etapa 3:** Geração da explicação narrada em **Áudio / Slides Sincronizados** sobre o capítulo enviado.
- [ ] **Etapa 4:** Geração automática do **Quiz Interativo** (JSON estruturado) com feedback imediato e indicação da página de referência.

---

## 🛠️ Tecnologias Utilizadas

- **[Next.js 15](https://nextjs.org/)** (App Router)
- **[React 19](https://react.dev/)** + **TypeScript**
- **[Tailwind CSS](https://tailwindcss.com/)** (Estilização responsiva e Dark Mode)
- **[Lucide React](https://lucide.dev/)** (Ícones da interface)

---

## 🚀 Como Executar o Projeto

### Opção 1: Pelo atalho rápido (Windows)
Basta dar dois cliques no arquivo **`iniciar.bat`** na raiz do projeto. Ele instalará as dependências (se necessário), abrirá o navegador automaticamente e iniciará o servidor.

### Opção 2: Pelo terminal
```bash
# 1. Instalar as dependências
npm install

# 2. Iniciar o servidor de desenvolvimento
npm run dev
```

Depois, acesse no navegador:
- **No computador:** `http://localhost:3000`
- **No celular (mesma rede Wi-Fi):** `http://<SEU_IP_LOCAL>:3000`

---

## 📂 Estrutura do Projeto

```text
Projeto_IA-Livro/
├── src/
│   └── app/
│       ├── globals.css     # Estilos globais e diretivas do Tailwind CSS
│       ├── layout.tsx      # Layout raiz e metadados da aplicação
│       └── page.tsx        # Página principal (Upload, organização e preview das páginas)
├── iniciar.bat             # Script de inicialização rápida no Windows
├── next.config.mjs         # Configuração do Next.js
├── package.json            # Dependências e scripts do projeto
├── postcss.config.mjs      # Configuração do PostCSS
├── tailwind.config.ts      # Configuração do Tailwind CSS
└── tsconfig.json           # Configuração do TypeScript
```
