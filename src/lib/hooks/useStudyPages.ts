"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { StudyPage, HomeViewMode } from "@/types/study";
import type { StudyAnalysis } from "@/types/ai";
import {
  MAX_PAGES_PER_STUDY,
  MAX_FILE_SIZE_BYTES,
  STUDY_MESSAGES,
} from "@/lib/constants";
import { calculateStudyMetrics } from "@/lib/utils";

export function useStudyPages() {
  const [viewMode, setViewMode] = useState<HomeViewMode>("composer");
  const [studyTitle, setStudyTitle] = useState("");
  const [pages, setPages] = useState<StudyPage[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeZoomPage, setActiveZoomPage] = useState<StudyPage | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [createdStudyId, setCreatedStudyId] = useState<string | null>(null);
  const [studyAnalysis, setStudyAnalysis] = useState<StudyAnalysis | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Validador de formato de imagem
  const isImageFile = (file: File): boolean => {
    if (file.type && file.type.startsWith("image/")) return true;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].includes(ext);
  };

  // Processar novos arquivos recebidos via input, drag-and-drop ou Ctrl+V
  const addFiles = useCallback((fileList: FileList | File[]) => {
    setErrorMessage(null);
    setIsSubmitted(false);

    const incomingFiles = Array.from(fileList);
    if (incomingFiles.length === 0) return;

    setPages((prevPages) => {
      // 1. Verificar se já atingiu o limite de 30 páginas
      if (prevPages.length >= MAX_PAGES_PER_STUDY) {
        setErrorMessage(STUDY_MESSAGES.MAX_PAGES_EXCEEDED);
        return prevPages;
      }

      const validFilesToAdd: File[] = [];

      for (const file of incomingFiles) {
        // 2. Rejeição de arquivos que não sejam imagens
        if (!isImageFile(file)) {
          setErrorMessage(STUDY_MESSAGES.INVALID_IMAGE);
          continue;
        }

        // 3. Limite individual de 15 MB
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setErrorMessage(STUDY_MESSAGES.FILE_TOO_LARGE);
          continue;
        }

        // 4. Prevenção de duplicatas por nome, tamanho e última modificação
        const isDuplicateInState = prevPages.some(
          (p) =>
            p.name === file.name &&
            p.sizeBytes === file.size &&
            p.file.lastModified === file.lastModified
        );
        const isDuplicateInBatch = validFilesToAdd.some(
          (f) =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );

        if (isDuplicateInState || isDuplicateInBatch) {
          setErrorMessage(STUDY_MESSAGES.DUPLICATE_FILE);
          continue;
        }

        // 5. Limite máximo de 30 páginas
        if (prevPages.length + validFilesToAdd.length >= MAX_PAGES_PER_STUDY) {
          setErrorMessage(STUDY_MESSAGES.MAX_PAGES_EXCEEDED);
          break;
        }

        validFilesToAdd.push(file);
      }

      if (validFilesToAdd.length === 0) {
        return prevPages;
      }

      const newPageItems: StudyPage[] = validFilesToAdd.map((file, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name || `pagina-${Date.now() + idx}.png`,
        sizeBytes: file.size,
        rotation: 0,
        addedAt: Date.now() + idx,
      }));

      return [...prevPages, ...newPageItems];
    });
  }, []);

  // Suporte para colar imagens com Ctrl+V direto na tela
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData?.files?.length) return;
      addFiles(e.clipboardData.files);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles]);

  // Limpar URLs criadas quando desmontar
  useEffect(() => {
    return () => {
      pages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removePage = (id: string) => {
    setIsSubmitted(false);
    setPages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setActiveZoomPage((prev) => (prev?.id === id ? null : prev));
  };

  const clearAllPages = () => {
    pages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPages([]);
    setIsSubmitted(false);
    setIsProcessing(false);
    setCreatedStudyId(null);
    setStudyAnalysis(null);
    setErrorMessage(null);
    setViewMode("composer");
  };

  const rotatePage = (id: string) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === id
          ? {
              ...page,
              rotation: (page.rotation + 90) % 360,
            }
          : page
      )
    );
    setActiveZoomPage((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            rotation: (prev.rotation + 90) % 360,
          }
        : prev
    );
  };

  const movePage = (index: number, direction: "left" | "right") => {
    setIsSubmitted(false);
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    });
  };

  const handleCardDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setPages((prev) => {
      const copy = [...prev];
      const [draggedItem] = copy.splice(draggedIndex, 1);
      copy.splice(index, 0, draggedItem);
      return copy;
    });
    setDraggedIndex(index);
  };

  const handleCardDragEnd = () => {
    setDraggedIndex(null);
  };

  const applySuggestion = (suggestion: string) => {
    setStudyTitle(suggestion);
  };

  // Iniciar fluxo de preparação do material com simulação progressiva (sem IA real nesta etapa)
  const startStudy = () => {
    if (pages.length === 0) {
      setErrorMessage("Adicione pelo menos uma página para iniciar o estudo.");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProcessingStep("Preparando o material de estudo...");
    setViewMode("processing");
  };

  const handleProcessingComplete = (analysis: StudyAnalysis) => {
    const newId = `estudo-${Date.now().toString(36)}`;
    setCreatedStudyId(newId);
    setStudyAnalysis(analysis);
    setIsProcessing(false);
    setIsSubmitted(true);
    setViewMode("workspace_preview");
  };

  const handleBackToPages = () => {
    setIsProcessing(false);
    setViewMode("composer");
  };

  const resetStudy = () => {
    setIsSubmitted(false);
    setIsProcessing(false);
    setCreatedStudyId(null);
    setStudyAnalysis(null);
    setViewMode("composer");
  };

  const totalSizeBytes = pages.reduce((acc, p) => acc + p.sizeBytes, 0);
  const metrics = calculateStudyMetrics(pages.length, totalSizeBytes);

  return {
    viewMode,
    setViewMode,
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
    setIsSubmitted,
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
    metrics,
  };
}
