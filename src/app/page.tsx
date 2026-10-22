"use client";

import React from "react";
import {
  HomeHeader,
  EmptyState,
  StudyComposer,
  QuickSuggestions,
  PagePreviewModal,
  HomeFooter,
  ErrorMessage,
  StudyProcessingView,
  StudyWorkspacePreview,
} from "@/components";
import { useStudyPages } from "@/lib/hooks/useStudyPages";
import type { StudyPage, BookPageImage } from "@/types";

export type { StudyPage, BookPageImage };

export default function HomePage() {
  const {
    viewMode,
    studyTitle,
    setStudyTitle,
    pages,
    isDraggingOver,
    errorMessage,
    setErrorMessage,
    activeZoomPage,
    setActiveZoomPage,
    draggedIndex,
    isSubmitted,
    isProcessing,
    processingStep,
    createdStudyId,
    studyAnalysis,
    startStudy,
    handleProcessingComplete,
    handleBackToPages,
    resetStudy,
    applySuggestion,
    fileInputRef,
    cameraInputRef,
    addFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removePage,
    clearAllPages,
    rotatePage,
    movePage,
    handleCardDragStart,
    handleCardDragOver,
    handleCardDragEnd,
  } = useStudyPages();

  const activeZoomIndex = activeZoomPage
    ? pages.findIndex((p) => p.id === activeZoomPage.id)
    : -1;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#f8faff] via-white to-[#f1f5fd] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-200">
      {/* 1. Cabeçalho Minimalista */}
      <HomeHeader
        onOpenMyStudies={() => {
          alert("Você poderá acompanhar e revisar seus estudos salvos nesta seção!");
        }}
        onOpenHelp={() => {
          alert(
            "Como funciona o EstudaIA:\n\n1. Envie ou fotografe as páginas do seu livro físico (até 30 páginas).\n2. Organize a sequência das fotos e gire se necessário.\n3. O EstudaIA lerá os textos e gerará resumo, aula didática e quiz prático!"
          );
        }}
      />

      {/* 2. Área Principal com Transição de Estados */}
      <main className="flex-1 flex flex-col justify-center items-center w-full px-3 sm:px-6 py-6 sm:py-12">
        <div
          className={`w-full mx-auto space-y-5 sm:space-y-6 transition-all duration-300 ${
            viewMode === "workspace_preview" ? "max-w-[880px]" : "max-w-[760px]"
          }`}
        >
          {/* Mensagem de Erro global com validações visíveis */}
          <ErrorMessage
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />

          {/* ESTADO 1: Composição e Revisão de Páginas */}
          {viewMode === "composer" && (
            <>
              {/* Apresentação / Empty State (Apenas quando não houver páginas ou no início) */}
              {pages.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="text-center space-y-1.5 pb-1">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Lote de estudo em preparação
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    Revise as páginas do seu material
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {pages.length}{" "}
                    {pages.length === 1
                      ? "página adicionada"
                      : "páginas adicionadas"}
                    . Organize a sequência antes de começar.
                  </p>
                </div>
              )}

              {/* Caixa de Composição Principal */}
              <StudyComposer
                studyTitle={studyTitle}
                onTitleChange={setStudyTitle}
                pages={pages}
                isDraggingOver={isDraggingOver}
                isProcessing={isProcessing}
                processingStep={processingStep}
                isSubmitted={isSubmitted}
                createdStudyId={createdStudyId}
                draggedIndex={draggedIndex}
                fileInputRef={fileInputRef}
                cameraInputRef={cameraInputRef}
                onFilesSelected={addFiles}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onMovePage={movePage}
                onRotatePage={rotatePage}
                onRemovePage={removePage}
                onZoomPage={(page) => setActiveZoomPage(page)}
                onCardDragStart={handleCardDragStart}
                onCardDragOver={handleCardDragOver}
                onCardDragEnd={handleCardDragEnd}
                onClearAll={clearAllPages}
                onStartStudy={startStudy}
                onResetStudy={resetStudy}
              />

              {/* Sugestões Rápidas (Abaixo do campo quando vazio) */}
              {pages.length === 0 && (
                <QuickSuggestions onSelectSuggestion={applySuggestion} />
              )}
            </>
          )}

          {/* ESTADO 2: Leitura Real das Páginas com IA Multimodal */}
          {viewMode === "processing" && (
            <StudyProcessingView
              pages={pages}
              studyTitle={studyTitle}
              onComplete={handleProcessingComplete}
              onCancel={handleBackToPages}
            />
          )}

          {/* ESTADO 3: Prévia do Ambiente de Estudo com Resultados Reais */}
          {viewMode === "workspace_preview" && (
            <StudyWorkspacePreview
              pages={pages}
              studyTitle={studyTitle}
              analysis={studyAnalysis}
              onBackToPages={handleBackToPages}
            />
          )}
        </div>
      </main>

      {/* 3. Rodapé Discreto com Garantia de Privacidade e Orientação */}
      <HomeFooter />

      {/* Modal de Zoom e Rotação de Imagens */}
      <PagePreviewModal
        page={activeZoomPage}
        pageIndex={activeZoomIndex}
        totalPages={pages.length}
        onClose={() => setActiveZoomPage(null)}
        onRotate={() => activeZoomPage && rotatePage(activeZoomPage.id)}
      />
    </div>
  );
}
