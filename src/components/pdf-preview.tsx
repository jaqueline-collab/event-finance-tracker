import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

function PdfPage({ document, number }: { document: PDFDocumentProxy; number: number }) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!width || !canvas.current) return;
    let cancelled = false;
    let rendering: { cancel: () => void; promise: Promise<unknown> } | undefined;
    (async () => {
      try {
        const page = await document.getPage(number);
        if (cancelled || !canvas.current) return;
        const scale = width / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });
        const ratio = window.devicePixelRatio || 1;
        const surface = canvas.current;
        surface.width = Math.ceil(viewport.width * ratio);
        surface.height = Math.ceil(viewport.height * ratio);
        surface.style.width = `${viewport.width}px`;
        surface.style.height = `${viewport.height}px`;
        const context = surface.getContext("2d");
        if (!context) throw new Error("Canvas indisponível");
        rendering = page.render({ canvasContext: context, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
        await rendering.promise;
      } catch (e) {
        console.error("Falha ao desenhar página do PDF", e);
        if (!cancelled && !(e instanceof Error && e.name === "RenderingCancelledException")) setError(true);
      }
    })();
    return () => { cancelled = true; rendering?.cancel(); };
  }, [document, number, width]);

  return <div ref={container} className="mx-auto w-full max-w-[820px]">
    {error ? <p role="alert" className="p-4 text-center text-sm text-destructive">Não foi possível exibir esta página.</p> : <canvas ref={canvas} aria-label={`Página ${number}`} className="block max-w-full shadow-sm" />}
  </div>;
}

export function PdfPreview({ url }: { url: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | undefined;
    let task: { destroy: () => Promise<void>; promise: Promise<PDFDocumentProxy> } | undefined;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        task = pdfjs.getDocument({ url });
        loaded = await task.promise;
        if (!cancelled) setDocument(loaded);
      } catch (cause) {
        console.error("Falha ao renderizar prévia de nota fiscal", cause);
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url]);

  if (error) return <p role="alert" className="p-5 text-center text-sm text-destructive">Não foi possível exibir o PDF. Você ainda pode baixá-lo.</p>;
  if (!document) return <p className="p-5 text-center text-sm text-muted-foreground">Carregando PDF…</p>;
  return <div className="flex w-full flex-col gap-4 p-2 sm:p-4">
    {Array.from({ length: document.numPages }, (_, index) => <PdfPage key={index} document={document} number={index + 1} />)}
  </div>;
}